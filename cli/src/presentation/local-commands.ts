import type { Command } from 'commander';
import fs from 'node:fs';
import { OllamaEngine } from '../infrastructure/ollama.js';
import { prepareLocal } from '../inference/application/local-engine.js';
import { evaluateModels } from '../inference/application/evaluate-models.js';
import { InferenceMetrics } from '../infrastructure/inference-metrics.js';
import {
  updateConfiguration,
  publicConfiguration,
  type Configuration,
} from '../infrastructure/configuration.js';
import type { LanguageModel } from '../shared/application/ports.js';
import { AresError } from '../shared/domain/errors.js';
import { assertShareable } from '../infrastructure/team-files.js';
import { saveOutput } from './output.js';

interface Actions {
  config(): Configuration;
  localConfig(model?: string): Configuration;
  cloudConfig(provider: string, model: string): Configuration;
  model(config: Configuration, signal?: AbortSignal): Promise<LanguageModel>;
  environment: NodeJS.ProcessEnv;
  output(value: unknown, text?: string): void;
  operation<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T>;
}
export function registerLocalCommands(program: Command, actions: Actions) {
  const local = program
    .command('local')
    .description('Motor Ollama en este equipo; modelos y límites personales');
  local
    .command('hardware')
    .description('Diagnóstico de recursos sin instalar Ollama ni llamar a IA')
    .action(async () => actions.output(await new OllamaEngine().resources()));
  local
    .command('status')
    .description('Detectar motor, modelos, RAM y memoria NVIDIA disponible')
    .action(async () => {
      const config = actions.localConfig();
      const engine = new OllamaEngine(config.baseUrl);
      const resources = await engine.resources();
      const data = await actions.operation(async (signal) => ({
        endpoint: config.baseUrl,
        version: await engine.version(signal),
        resources,
        models: await engine.models(signal),
        ...(config.model
          ? {
              selected: await prepareLocal(
                engine,
                config.model,
                config.localContext,
                config.maxTokens,
                signal,
              ),
            }
          : {}),
      }));
      actions.output(data);
    });
  local
    .command('models')
    .description('Listar pesos instalados; excluye referencias remotas')
    .action(async () => {
      const models = await actions.operation((signal) =>
        new OllamaEngine(actions.localConfig().baseUrl).models(signal),
      );
      actions.output(
        { models },
        models
          .map(
            (model) =>
              `${model.name} | ${(model.sizeBytes / 1024 ** 3).toFixed(2)} GiB | ${model.digest}`,
          )
          .join('\n') || 'No hay modelos locales. Instala uno con ollama pull <modelo>.',
      );
    });
  local
    .command('use <model>')
    .description('Seleccionar un modelo instalado; conserva los perfiles de nube')
    .option('--context <tokens>', 'auto o entre 2048 y 32768')
    .action(async (name, opts) => {
      if (
        opts.context !== undefined &&
        opts.context !== 'auto' &&
        (!Number.isInteger(Number(opts.context)) ||
          Number(opts.context) < 2048 ||
          Number(opts.context) > 32768)
      )
        throw new AresError(
          'VALIDATION',
          '--context requiere auto o un entero entre 2048 y 32768.',
        );
      const config = actions.localConfig(name);
      const prepared = await actions.operation((signal) =>
        prepareLocal(
          new OllamaEngine(config.baseUrl),
          name,
          opts.context === undefined
            ? config.localContext
            : opts.context === 'auto'
              ? undefined
              : Number(opts.context),
          config.maxTokens,
          signal,
        ),
      );
      const written = updateConfiguration(
        { provider: 'ollama', model: name, localContext: opts.context },
        actions.environment,
      );
      const effective = actions.config();
      actions.output(
        {
          configuration: publicConfiguration(written),
          effective: publicConfiguration(effective),
          ...prepared,
        },
        `Modelo local guardado: ${name}\nContexto: ${prepared.budget.contextTokens}; salida: ${prepared.budget.outputTokens} tokens.\n${prepared.budget.recommendation}\nLas opciones del proceso o del proyecto conservan precedencia. Usa ares doctor --probe.`,
      );
    });
  program
    .command('metrics')
    .description('Últimas solicitudes: duración y tokens reportados, sin consultas ni código')
    .option('--limit <number>', 'Entre 1 y 1000', '20')
    .action((opts) => {
      const limit = Number(opts.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
        throw new AresError('VALIDATION', '--limit requiere un entero entre 1 y 1000.');
      const measurements = new InferenceMetrics(actions.config().home).list(limit).map((row) => {
        const speed =
          row.usage.outputTokens !== undefined &&
          typeof row.usage.generationMs === 'number' &&
          row.usage.generationMs > 0
            ? (row.usage.outputTokens * 1000) / row.usage.generationMs
            : undefined;
        return { ...row, ...(speed === undefined ? {} : { outputTokensPerSecond: speed }) };
      });
      actions.output(
        {
          measurements,
          note: 'Los tokens ausentes no fueron reportados. Los presupuestos de entrada local son estimaciones conservadoras; la cuota o saldo del proveedor no se deduce de estos datos.',
        },
        measurements
          .map(
            (row) =>
              `${row.at} | ${row.model} | ${row.status} | ${Math.round(row.durationMs)} ms | entrada ${row.usage.inputTokens ?? '?'} / salida ${row.usage.outputTokens ?? '?'} tokens`,
          )
          .join('\n') || 'Todavía no hay inferencias registradas.',
      );
    });
  program
    .command('evaluate')
    .description(
      'Comparar tareas sintéticas iguales en local y nube; realiza llamadas explícitas a ambos',
    )
    .requiredOption('--local-model <model>', 'Modelo Ollama instalado')
    .requiredOption('--cloud-provider <provider>', 'Proveedor de nube')
    .requiredOption('--cloud-model <model>', 'Modelo de nube')
    .option('--runs <number>', 'Repeticiones entre 1 y 5', '1')
    .option('-o, --output <file>', 'Nuevo informe JSON')
    .action(async (opts) => {
      const runs = Number(opts.runs);
      if (!Number.isInteger(runs) || runs < 1 || runs > 5)
        throw new AresError('VALIDATION', '--runs requiere un entero entre 1 y 5.');
      if (['ollama', 'compatible'].includes(opts.cloudProvider))
        throw new AresError(
          'VALIDATION',
          'Elige un proveedor de nube explícito para la comparación.',
        );
      if (opts.output && fs.existsSync(opts.output))
        throw new AresError(
          'CONFLICT',
          'El informe ya existe; elige otro nombre antes de realizar solicitudes.',
        );
      const local = { ...actions.localConfig(opts.localModel), maxTokens: 512 };
      const cloud = { ...actions.cloudConfig(opts.cloudProvider, opts.cloudModel), maxTokens: 512 };
      const report = await actions.operation((signal) =>
        evaluateModels(
          [
            { label: 'local', create: (signal) => actions.model(local, signal) },
            { label: 'cloud', create: (signal) => actions.model(cloud, signal) },
          ],
          runs,
          signal,
        ),
      );
      const text = JSON.stringify(report, null, 2) + '\n';
      assertShareable(text, actions.config().secrets);
      const file = opts.output ? saveOutput(opts.output, text) : undefined;
      actions.output({ ...report, ...(file ? { file } : {}) });
      if (report.results.some((result) => !result.passed)) process.exitCode = 1;
    });
}
