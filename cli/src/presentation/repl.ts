import readline from 'node:readline';
import type { Configuration } from '../infrastructure/configuration.js';
import { requireAi } from '../infrastructure/configuration.js';
import { diagnostic, print } from './output.js';
import { terminalText } from '../infrastructure/text.js';

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
  execute(args: string[], signal: AbortSignal): Promise<void>;
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
): Promise<void> {
  const terminal = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  print(
    `ARES | Ingeniería desde terminal\n${config.provider} / ${config.model || 'modelo sin configurar'}\n/help para ver comandos. Ctrl+C cancela una respuesta; /exit termina.`,
    false,
  );
  try {
    requireAi(config);
  } catch (error) {
    diagnostic((error as Error).message);
  }
  const delegated = [
    'audit',
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
  ];
  const commands = [
    '/help',
    '/new',
    '/history',
    '/sessions',
    '/resume',
    '/context',
    '/doctor',
    '/model',
    '/exit',
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
  let context: string | undefined;
  let active: AbortController | undefined;
  const interrupt = () => {
    if (active) active.abort();
    else rl.close();
  };
  rl.on('SIGINT', interrupt);
  process.on('SIGINT', interrupt);
  const prompt = () => {
    if (terminal) {
      rl.setPrompt(sessionId ? `ares [${sessionId.slice(0, 8)}]> ` : 'ares> ');
      rl.prompt();
    }
  };
  prompt();
  try {
    for await (const raw of rl) {
      const line = raw.trim();
      if (!line) {
        prompt();
        continue;
      }
      if (['/exit', '/quit', 'exit', 'quit'].includes(line)) break;
      try {
        if (line === '/help')
          print(
            '/new                  Nueva conversación\n/history              Historial de esta sesión\n/sessions             Listar sesiones guardadas\n/resume ID            Reanudar sesión\n/context RUTA         Adjuntar contexto local\n/context              Retirar contexto\n/doctor               Configuración y disponibilidad\n/models               Catálogo actual del proveedor\n/model ID             Cambiar modelo en esta terminal\n/audit RUTA           Inspección local\n/forge NUEVA_CARPETA   Crear proyecto DDD de ejemplo\n/propose INSTRUCCION   Crear propuesta (--path RUTA)\n/diff ID              Revisar propuesta\n/apply ID             Aplicar propuesta\n/verify ID            Ejecutar tests de una propuesta aplicada\n/restore ID           Restaurar archivos\n/doc, /test           Proponer documentos y tests\n/verifications list   Evidencia de verificaciones\n/exit                 Salir\n\nLos comandos usan las mismas opciones que ares; admiten --help y rutas entre comillas. Escribe texto libre para conversar.',
            false,
          );
        else if (line === '/new') {
          sessionId = undefined;
          print('Nueva conversación.', false);
        } else if (line === '/sessions') actions.sessions();
        else if (line === '/history') {
          if (sessionId) actions.history(sessionId);
          else print('Todavía no hay turnos guardados.', false);
        } else if (line.startsWith('/resume ')) {
          const id = line.slice(8).trim();
          if (!actions.exists(id))
            throw new Error('Sesión no encontrada. Usa el ID completo de /sessions.');
          sessionId = id;
          print(`Sesión: ${id}`, false);
        } else if (line === '/context' || line.startsWith('/context ')) {
          const args = commandArguments(line);
          if (args.length > 2) throw new Error('Usa /context "ruta con espacios".');
          context = args[1] || undefined;
          print(context ? `Contexto: ${context}` : 'Contexto retirado.', false);
        } else if (line === '/doctor') await actions.doctor();
        else if (line.startsWith('/model ')) {
          const args = commandArguments(line);
          if (args.length !== 2 || !args[1]) throw new Error('Usa /model ID.');
          actions.setModel(args[1]);
          print(`Modelo seleccionado: ${args[1]}`, false);
        } else if (line.startsWith('/')) {
          const [command, ...args] = commandArguments(line);
          if (!delegated.includes(command.slice(1)))
            throw new Error('Comando desconocido. Usa /help.');
          active = new AbortController();
          await actions.execute([command.slice(1), ...args], active.signal);
        } else {
          active = new AbortController();
          process.stdout.write('ares: ');
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
