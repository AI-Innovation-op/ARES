import readline from 'node:readline';
import type { Configuration } from '../infrastructure/configuration.js';
import { requireAi } from '../infrastructure/configuration.js';
import { diagnostic, print } from './output.js';
import { terminalText } from '../infrastructure/text.js';
import { TerminalUi, terminalProfile } from './terminal-ui.js';

export interface ShellActions {
  ask(
    prompt: string,
    sessionId: string | undefined,
    context: string | undefined,
    signal: AbortSignal,
  ): Promise<string>;
  history(id: string): void;
  sessions(): void;
  exists(id: string): boolean;
  doctor(): Promise<void>;
  setModel(id: string): void;
  setProvider(id: string): Pick<Configuration, 'provider' | 'model'>;
  execute(args: string[], signal: AbortSignal): Promise<void>;
  project(): string | undefined;
  openProject(target: string): string;
  closeProject(): void;
  selection(): Pick<Configuration, 'provider' | 'model'>;
}

/** Quotes group arguments; backslashes are literal so Windows paths remain intact. */
export function commandArguments(line: string): string[] {
  const args: string[] = [];
  let value = '',
    quote = '',
    active = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quote) {
      if (char === quote && line[index + 1] === quote) {
        value += char;
        index++;
      } else if (char === quote) quote = '';
      else value += char;
      active = true;
    } else if (char === '"' || char === "'") {
      quote = char;
      active = true;
    } else if (/\s/.test(char)) {
      if (active) {
        args.push(value);
        value = '';
        active = false;
      }
    } else {
      value += char;
      active = true;
    }
  }
  if (quote) throw new Error('Falta cerrar una comilla en el comando.');
  if (active) args.push(value);
  return args;
}

export async function interactiveShell(
  config: Configuration,
  actions: ShellActions,
  version: string,
): Promise<void> {
  const terminal = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const ui = new TerminalUi(version, () => terminalProfile(terminal));
  let selectedModel = config.model;
  let selectedProvider = config.provider;
  const banner = () =>
    process.stdout.write(
      ui.banner({ ...config, provider: selectedProvider, model: selectedModel }, actions.project()),
    );
  banner();
  try {
    requireAi(config);
  } catch (error) {
    diagnostic((error as Error).message);
  }
  const delegated = [
    'audit',
    'analyze',
    'forge',
    'doc',
    'test',
    'propose',
    'proposals',
    'diff',
    'apply',
    'restore',
    'verify',
    'verifications',
    'models',
    'providers',
    'search',
  ];
  const commands = [
    '/help',
    '/new',
    '/history',
    '/sessions',
    '/resume',
    '/context',
    '/open',
    '/close',
    '/doctor',
    '/model',
    '/provider',
    '/exit',
    '/clear',
    '/cls',
    '/status',
    'help',
    'ayuda',
    'status',
    'clear',
    'cls',
    ...delegated.map((command) => '/' + command),
  ];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal,
    historySize: 100,
    completer: (line: string): [string[], string] => [
      commands.filter((command) => command.startsWith(line)),
      line,
    ],
  });
  let sessionId: string | undefined;
  let context: string | undefined = actions.project();
  let active: AbortController | undefined;
  const interrupt = () => {
    if (active) active.abort();
    else rl.close();
  };
  rl.on('SIGINT', interrupt);
  process.on('SIGINT', interrupt);
  const prompt = () => {
    if (terminal) {
      rl.setPrompt(ui.prompt(sessionId));
      rl.prompt();
    }
  };
  prompt();
  try {
    for await (const raw of rl) {
      const entered = raw.trim();
      const line = ['help', 'ayuda'].includes(entered)
        ? '/help'
        : ['status', '/status'].includes(entered)
          ? '/doctor'
          : ['clear', 'cls', '/cls'].includes(entered)
            ? '/clear'
            : entered;
      if (!line) {
        prompt();
        continue;
      }
      if (['/exit', '/quit', 'exit', 'quit'].includes(line)) break;
      try {
        if (line === '/help') process.stdout.write(ui.help());
        else if (line === '/clear') {
          process.stdout.write(ui.clear());
          banner();
        } else if (line === '/open' || line.startsWith('/open ')) {
          const args = commandArguments(line);
          if (args.length !== 2) throw new Error('Usa /open "carpeta del proyecto".');
          const previous = actions.project();
          const root = actions.openProject(args[1]);
          const selected = actions.selection();
          selectedProvider = selected.provider;
          selectedModel = selected.model;
          if (previous !== root) sessionId = undefined;
          context = root;
          print(
            `Proyecto activo: ${root}\nEl contexto y las rutas relativas usan esta carpeta.`,
            false,
          );
        } else if (line === '/close') {
          const previous = actions.project();
          actions.closeProject();
          const selected = actions.selection();
          selectedProvider = selected.provider;
          selectedModel = selected.model;
          if (previous) {
            sessionId = undefined;
            context = undefined;
          }
          print(
            previous
              ? 'Proyecto cerrado; nueva conversación sin proyecto.'
              : 'No hay proyecto activo.',
            false,
          );
        } else if (line === '/new') {
          sessionId = undefined;
          print('Nueva conversación.', false);
        } else if (line === '/sessions') actions.sessions();
        else if (line === '/history') {
          if (sessionId) actions.history(sessionId);
          else print('Todavía no hay turnos guardados.', false);
        } else if (line.startsWith('/resume ')) {
          const id = line.slice(8).trim();
          if (!actions.exists(id))
            throw new Error(
              'Sesión no encontrada. Usa el ID de /sessions o un prefijo único de al menos 8 caracteres.',
            );
          sessionId = id;
          print(`Sesión: ${id}`, false);
        } else if (line === '/context' || line.startsWith('/context ')) {
          const args = commandArguments(line);
          if (args.length > 2) throw new Error('Usa /context "ruta con espacios".');
          context = args[1] || undefined;
          print(context ? `Contexto: ${context}` : 'Contexto retirado.', false);
        } else if (line === '/doctor') await actions.doctor();
        else if (line.startsWith('/provider ')) {
          const args = commandArguments(line);
          if (args.length !== 2)
            throw new Error('Usa /provider ID. /providers muestra los disponibles.');
          const selected = actions.setProvider(args[1]);
          selectedProvider = selected.provider;
          selectedModel = selected.model;
          print(
            `Proveedor: ${selected.provider} | Modelo: ${selected.model || 'sin configurar'}\nConexión sin verificar; /models consulta el catálogo.`,
            false,
          );
        } else if (line.startsWith('/model ')) {
          const args = commandArguments(line);
          if (args.length !== 2 || !args[1]) throw new Error('Usa /model ID.');
          actions.setModel(args[1]);
          selectedModel = args[1];
          print(`Modelo seleccionado: ${args[1]}`, false);
        } else if (line.startsWith('/')) {
          const [command, ...args] = commandArguments(line);
          if (!delegated.includes(command.slice(1)))
            throw new Error('Comando desconocido. Usa /help.');
          active = new AbortController();
          await actions.execute(
            command === '/search' ? ['sessions', 'search', ...args] : [command.slice(1), ...args],
            active.signal,
          );
        } else {
          active = new AbortController();
          process.stdout.write(ui.assistant());
          sessionId = await actions.ask(line, sessionId, context, active.signal);
        }
      } catch (error) {
        diagnostic(
          `\n${terminalText(error instanceof Error ? error.message : 'Error inesperado.')}`,
        );
      } finally {
        active = undefined;
      }
      prompt();
    }
  } finally {
    rl.close();
    process.off('SIGINT', interrupt);
    rl.off('SIGINT', interrupt);
  }
}
