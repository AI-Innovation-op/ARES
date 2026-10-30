import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { AresError } from '../shared/domain/errors.js';
import {
  configurationLocation,
  updateConfiguration,
  type Configuration,
} from '../infrastructure/configuration.js';
import { diagnostic } from './output.js';

function terminalInterface() {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new AresError(
      'CONFIG',
      'La entrada oculta requiere terminal; para automatización usa config set --key-stdin.',
    );
  const state = { hidden: false };
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (state.hidden) callback();
      else process.stdout.write(chunk, encoding, callback);
    },
  });
  Object.assign(output, { isTTY: true, columns: process.stdout.columns });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
    historySize: 0,
  });
  return { rl, state };
}

async function hiddenQuestion(
  terminal: ReturnType<typeof terminalInterface>,
  prompt: string,
  signal: AbortSignal,
): Promise<string> {
  if (!process.stdin.isRaw)
    throw new AresError(
      'CONFIG',
      'No se pudo asegurar la entrada oculta. Usa config set --key-stdin; no se solicitó una clave.',
    );
  terminal.state.hidden = true;
  process.stdout.write(prompt);
  try {
    return await terminal.rl.question('', { signal });
  } finally {
    process.stdout.write('\n');
  }
}

export async function setupConfiguration(signal?: AbortSignal): Promise<Configuration> {
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const terminal = terminalInterface();
  terminal.rl.on('SIGINT', () => controller.abort());
  let provider = '',
    model = '',
    baseUrl: string | undefined,
    apiKey = '';
  try {
    provider =
      (
        await terminal.rl.question('Proveedor [openrouter/gemini/compatible] (openrouter): ', {
          signal: combined,
        })
      ).trim() || 'openrouter';
    if (!['openrouter', 'gemini', 'compatible'].includes(provider))
      throw new AresError('CONFIG', 'Proveedor inválido.');
    model = (
      await terminal.rl.question('ID del modelo (consulta ares models si lo necesitas): ', {
        signal: combined,
      })
    ).trim();
    if (!model) throw new AresError('CONFIG', 'Es necesario indicar un modelo.');
    if (provider === 'compatible')
      baseUrl =
        (
          await terminal.rl.question('Base URL (http://127.0.0.1:11434/v1): ', { signal: combined })
        ).trim() || 'http://127.0.0.1:11434/v1';
    apiKey = await hiddenQuestion(
      terminal,
      provider === 'compatible'
        ? 'Clave opcional (Enter para omitir; entrada oculta): '
        : 'Clave API (entrada oculta): ',
      combined,
    );
  } catch (error) {
    if (combined.aborted) throw new AresError('CANCELLED', 'Configuración cancelada.');
    throw error;
  } finally {
    terminal.rl.close();
    process.stdin.unref();
  }
  if (!apiKey && provider !== 'compatible')
    throw new AresError('CONFIG', 'Falta la clave; no se guardó la configuración.');
  const result = updateConfiguration({ provider, model, baseUrl, ...(apiKey ? { apiKey } : {}) });
  diagnostic(
    `Configuración guardada en ${configurationLocation().envFile}. Las variables del proceso o del proyecto tienen precedencia.`,
  );
  return result;
}
