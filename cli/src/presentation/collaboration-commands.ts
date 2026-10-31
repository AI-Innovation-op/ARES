import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { TeamPolicy } from '../collaboration/domain/team-policy.js';
import type { ShareProposal } from '../collaboration/application/share-proposal.js';
import { assertShareable, loadChangeBundle, loadTeamPolicy } from '../infrastructure/team-files.js';
import type { Configuration } from '../infrastructure/configuration.js';
import { providerDefinition } from '../infrastructure/providers.js';
import type { WorkspaceReader } from '../workspace/application/inspect.js';
import type { VerifyProject } from '../verification/application/verify-project.js';
import type { CheckPlan } from '../verification/application/verify-project.js';
import type { VerificationData } from '../verification/domain/verification.js';
import { AresError } from '../shared/domain/errors.js';
import { saveOutput } from './output.js';

interface CollaborationActions {
  config(): Configuration;
  share(): ShareProposal;
  verifier(): VerifyProject;
  plan(root: string, script: string): CheckPlan;
  workspace: WorkspaceReader;
  output(value: unknown, text?: string): void;
  operation<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T>;
}
export function registerCollaborationCommands(
  program: Command,
  actions: CollaborationActions,
): void {
  const root = () => fs.realpathSync(process.cwd());
  const team = program
    .command('team')
    .description('Acuerdos del equipo guardados en Git; claves e historial personales');
  team
    .command('init')
    .option('--name <nombre>', 'Nombre compartido del proyecto')
    .option('--check <script...>', 'Scripts de package.json que ejecutará el equipo')
    .option('--ai-provider <proveedor>', 'Proveedor recomendado; cada persona conserva su clave')
    .option('--ai-model <modelo>', 'Modelo recomendado del proveedor')
    .action((opts) => {
      if (Boolean(opts.aiProvider) !== Boolean(opts.aiModel))
        throw new AresError('VALIDATION', 'Usa --ai-provider y --ai-model juntos.');
      let checks: string[] = opts.check || [];
      if (!opts.check && fs.existsSync(path.join(root(), 'package.json'))) {
        let metadata;
        try {
          metadata = JSON.parse(fs.readFileSync(path.join(root(), 'package.json'), 'utf8'));
        } catch {
          throw new AresError('VALIDATION', 'package.json inválido.');
        }
        const scripts = metadata.scripts || {};
        checks =
          typeof scripts.check === 'string'
            ? ['check']
            : ['typecheck', 'lint', 'test'].filter((name) => typeof scripts[name] === 'string');
      }
      const policy = new TeamPolicy({
        version: 1,
        name: opts.name || path.basename(root()),
        checks,
        ...(opts.aiProvider ? { ai: { provider: opts.aiProvider, model: opts.aiModel } } : {}),
      });
      if (policy.data.ai) providerDefinition(policy.data.ai.provider);
      const text = JSON.stringify(policy.data, null, 2) + '\n';
      assertShareable(text, actions.config().secrets);
      const file = saveOutput(path.join(root(), 'ares.team.json'), text);
      actions.output(
        { file, ...policy.data },
        `Acuerdos creados: ${file}\nGuarda ares.team.json en Git. Las claves e historiales permanecen en cada equipo.\nNo se ejecutaron scripts.`,
      );
    });
  team.command('show').action(() => {
    const policy = loadTeamPolicy(root(), actions.config().secrets);
    if (!policy) throw new AresError('NOT_FOUND', 'No hay ares.team.json; usa team init.');
    actions.output(
      policy.data,
      `Equipo: ${policy.data.name}\nComprobaciones: ${policy.data.checks.join(', ') || 'sin definir'}\nIA recomendada: ${policy.data.ai ? policy.data.ai.provider + ' / ' + policy.data.ai.model : 'configuración personal'}`,
    );
  });
  team
    .command('check')
    .description('Ejecutar los scripts acordados; requiere confiar en el proyecto')
    .option('--timeout <ms>', 'Timeout por comprobación', '120000')
    .action(async (opts) => {
      const policy = loadTeamPolicy(root(), actions.config().secrets);
      if (!policy || !policy.data.checks.length)
        throw new AresError(
          'CONFIG',
          'Define scripts de package.json en ares.team.json antes de usar team check.',
        );
      const timeoutMs = Number(opts.timeout);
      if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600_000)
        throw new AresError('VALIDATION', 'Timeout fuera del rango 100..600000.');
      for (const script of policy.data.checks) actions.plan(root(), script);
      const records = await actions.operation(async (signal) => {
        const result: VerificationData[] = [];
        for (const script of policy.data.checks) {
          const record = await actions
            .verifier()
            .execute({ root: root(), script, timeoutMs, signal });
          result.push(record);
          if (record.status !== 'passed') break;
        }
        return result;
      });
      const passed =
        records.length === policy.data.checks.length &&
        records.every((record) => record.status === 'passed');
      const notRun = policy.data.checks.slice(records.length);
      actions.output(
        { name: policy.data.name, status: passed ? 'passed' : 'failed', records, notRun },
        `Equipo: ${policy.data.name}\n${records.map((record) => record.script + ': ' + record.status + ' (' + record.durationMs + ' ms)\n' + record.stdout + record.stderr).join('\n')}${notRun.length ? '\nSin ejecutar: ' + notRun.join(', ') : ''}`,
      );
      if (!passed) process.exitCode = records.at(-1)?.status === 'cancelled' ? 130 : 1;
    });

  const handoff = program
    .command('handoff')
    .description('Intercambiar propuestas sin compartir bases, claves ni copias locales');
  handoff
    .command('export <id>')
    .requiredOption('-o, --output <archivo>', 'Nuevo archivo JSON para revisión')
    .action((id, opts) => {
      const bundle = actions.share().export(id);
      const text = JSON.stringify(bundle.data, null, 2) + '\n';
      assertShareable(text, actions.config().secrets);
      const file = saveOutput(opts.output, text);
      actions.output(
        { file, digest: bundle.data.digest, files: bundle.data.changes.length },
        `Propuesta exportada: ${file}\nHuella: ${bundle.data.digest}\nComparte el archivo para revisión. La huella comprueba integridad, no autoría.`,
      );
    });
  handoff.command('inspect <archivo>').action((file) => {
    const bundle = loadChangeBundle(file, actions.config().secrets);
    actions.share().verify(bundle);
    actions.output(
      {
        summary: bundle.data.summary,
        digest: bundle.data.digest,
        createdAt: bundle.data.createdAt,
        changes: bundle.data.changes.map((change) => ({
          path: change.path,
          operation:
            change.beforeHash === null ? 'create' : change.after === null ? 'delete' : 'replace',
        })),
      },
      `Resumen: ${bundle.data.summary}\n${bundle.data.changes.map((change) => change.path).join('\n')}\nIntegridad comprobada; la huella no acredita autoría.`,
    );
  });
  handoff
    .command('import <archivo>')
    .option('--path <directorio>', 'Copia local del proyecto', '.')
    .action((file, opts) => {
      const bundle = loadChangeBundle(file, actions.config().secrets);
      const target = path.resolve(opts.path);
      if (!fs.statSync(target).isDirectory())
        throw new AresError('VALIDATION', '--path debe ser un directorio.');
      const snapshot = actions.workspace.scan(target);
      const proposal = actions.share().import(bundle, snapshot);
      actions.output(
        proposal,
        `Propuesta importada sin aplicar: ${proposal.id}\nRevisar: ares diff ${proposal.id}\nAplicar: ares apply ${proposal.id}\nLa verificación se ejecuta en esta copia; no se transfirió evidencia de otra máquina.`,
      );
    });
}
