import readline from 'node:readline';
import type { Configuration } from '../infrastructure/configuration.js';
import { requireAi } from '../infrastructure/configuration.js';
import { diagnostic, print } from './output.js';
import { terminalText } from '../infrastructure/text.js';

export interface ShellActions {
  ask(prompt: string, sessionId: string | undefined, context: string | undefined, signal: AbortSignal): Promise<string>;
  history(id: string): void;
  sessions(): void;
  exists(id: string): boolean;
  doctor(): Promise<void>;
}

export async function interactiveShell(config: Configuration, actions: ShellActions): Promise<void> {
  const terminal = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  print(`ARES | Ingeniería desde terminal\n${config.provider} / ${config.model || 'modelo sin configurar'}\n/help para ver comandos. Ctrl+C cancela una respuesta; /exit termina.`, false);
  try { requireAi(config); } catch (error) { diagnostic((error as Error).message); }
  const commands = ['/help', '/new', '/history', '/sessions', '/resume', '/context', '/doctor', '/exit'];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal, historySize: 100, completer: (line: string): [string[], string] => [commands.filter(command => command.startsWith(line)), line] });
  let sessionId: string | undefined;
  let context: string | undefined;
  let active: AbortController | undefined;
  const interrupt = () => { if (active) active.abort(); else rl.close(); };
  rl.on('SIGINT', interrupt);
  process.on('SIGINT', interrupt);
  const prompt = () => { if (terminal) { rl.setPrompt(sessionId ? `ares [${sessionId.slice(0, 8)}]> ` : 'ares> '); rl.prompt(); } };
  prompt();
  try {
    for await (const raw of rl) {
      const line = raw.trim();
      if (!line) { prompt(); continue; }
      if (['/exit', '/quit', 'exit', 'quit'].includes(line)) break;
      try {
        if (line === '/help') print('/new                  Nueva conversación\n/history              Historial de esta sesión\n/sessions             Listar sesiones guardadas\n/resume ID            Reanudar sesión\n/context RUTA         Adjuntar contexto local (solo en esta terminal)\n/context              Retirar contexto\n/doctor               Configuración y disponibilidad\n/exit                 Salir\n\nEscribe texto libre para conversar. Fuera de la sesión: ares audit, forge, doc, propose, diff, apply, restore.', false);
        else if (line === '/new') { sessionId = undefined; print('Nueva conversación.', false); }
        else if (line === '/sessions') actions.sessions();
        else if (line === '/history') { if (sessionId) actions.history(sessionId); else print('Todavía no hay turnos guardados.', false); }
        else if (line.startsWith('/resume ')) {
          const id = line.slice(8).trim();
          if (!actions.exists(id)) throw new Error('Sesión no encontrada. Usa el ID completo de /sessions.');
          sessionId = id; print(`Sesión: ${id}`, false);
        } else if (line === '/context' || line.startsWith('/context ')) { context = line.slice(8).trim() || undefined; print(context ? `Contexto: ${context}` : 'Contexto retirado.', false); }
        else if (line === '/doctor') await actions.doctor();
        else if (line.startsWith('/')) throw new Error('Comando desconocido. Usa /help.');
        else {
          active = new AbortController();
          process.stdout.write('ares: ');
          sessionId = await actions.ask(line, sessionId, context, active.signal);
        }
      } catch (error) { diagnostic(`\n${terminalText(error instanceof Error ? error.message : 'Error inesperado.')}`); }
      finally { active = undefined; }
      prompt();
    }
  } finally {
    rl.close(); process.off('SIGINT', interrupt); rl.off('SIGINT', interrupt);
  }
}
