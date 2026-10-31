import type { Configuration } from '../infrastructure/configuration.js';
import { redact, terminalText } from '../infrastructure/text.js';

const LOGO = [
  '  ██████╗   ██████╗   ███████╗  ███████╗',
  '  ██╔══██╗  ██╔══██╗  ██╔════╝  ██╔════╝',
  '  ███████║  ██████╔╝  █████╗    ███████╗',
  '  ██╔══██║  ██╔══██╗  ██╔══╝    ╚════██║',
  '  ██║  ██║  ██║  ██║  ███████╗  ███████║',
  '  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚══════╝  ╚══════╝',
];
const COMMANDS = [
  ['help / /help', 'Mostrar este catálogo de órdenes.'],
  ['/new', 'Iniciar una conversación nueva.'],
  ['/history', 'Consultar los turnos de esta sesión.'],
  ['/sessions', 'Listar conversaciones guardadas.'],
  ['/resume ID', 'Reanudar una conversación.'],
  ['/search PALABRAS', 'Buscar en el historial local.'],
  ['/context RUTA', 'Adjuntar contexto; sin ruta, retirarlo.'],
  ['/open RUTA', 'Abrir carpeta o @alias como proyecto activo.'],
  ['/projects', 'Alias, perfiles de IA y reubicación de proyectos.'],
  ['/team', 'Acuerdos y comprobaciones compartidos en Git.'],
  ['/handoff', 'Exportar, inspeccionar e importar propuestas.'],
  ['/close', 'Cerrar proyecto y volver a la carpeta inicial.'],
  ['status / /doctor', 'Consultar configuración; conexión sin verificar.'],
  ['/models', 'Consultar el catálogo actual del proveedor.'],
  ['/providers', 'Listar proveedores y perfiles locales.'],
  ['/provider ID', 'Cambiar de proveedor usando su propio perfil.'],
  ['/model ID', 'Seleccionar modelo en esta terminal.'],
  ['/audit RUTA', 'Inspeccionar señales estáticas con ruta y línea.'],
  ['/analyze RUTA', 'Analizar imports, capas y ciclos mediante AST.'],
  ['/forge CARPETA', 'Crear una plantilla CLI DDD de tareas.'],
  ['/propose TEXTO', 'Preparar cambios revisables; usa --path RUTA.'],
  ['/diff ID', 'Revisar el diff de una propuesta.'],
  ['/apply ID', 'Aplicar los cambios con copias de recuperación.'],
  ['/verify ID', 'Ejecutar el script elegido y guardar evidencia.'],
  ['/restore ID', 'Restaurar una propuesta sin pisar ediciones posteriores.'],
  ['/verifications list', 'Consultar verificaciones guardadas.'],
  ['/doc / /test', 'Proponer documentación o tests con IA.'],
  ['clear / cls', 'Limpiar la pantalla y redibujar el banner.'],
  ['exit / /exit', 'Cerrar la sesión de terminal.'],
];

export interface TerminalProfile {
  interactive: boolean;
  columns: number;
  colors: boolean;
  controls: boolean;
}

export function terminalProfile(interactive: boolean): TerminalProfile {
  const controls = interactive && process.env.TERM !== 'dumb';
  return {
    interactive,
    columns: process.stdout.columns || 80,
    controls,
    colors: controls && !('NO_COLOR' in process.env) && process.stdout.getColorDepth() > 1,
  };
}

/** Only this trusted renderer emits styling; all interpolated content is sanitized first. */
export class TerminalUi {
  constructor(
    private readonly version: string,
    private readonly profile: () => TerminalProfile,
  ) {}

  private paint(text: string, color: 'accent' | 'muted' | 'strong' | 'pending' = 'accent'): string {
    const plain = terminalText(redact(text));
    if (!this.profile().colors) return plain;
    const code = { accent: '96', muted: '37', strong: '1;97', pending: '93' }[color];
    return `\x1b[${code}m${plain}\x1b[0m`;
  }

  private wrap(text: string, indent = 2): string {
    const width = Math.max(12, this.profile().columns - indent - 1);
    const lines: string[] = [];
    let line = '';
    for (const word of terminalText(redact(text)).split(/\s+/)) {
      if (line && [...line, ' ', ...word].length > width) {
        lines.push(' '.repeat(indent) + line);
        line = '';
      }
      const characters = [...word];
      while (characters.length > width) {
        if (line) {
          lines.push(' '.repeat(indent) + line);
          line = '';
        }
        lines.push(' '.repeat(indent) + characters.splice(0, width).join(''));
      }
      const rest = characters.join('');
      line += (line && rest ? ' ' : '') + rest;
    }
    if (line) lines.push(' '.repeat(indent) + line);
    return lines.join('\n');
  }

  banner(config: Configuration, project?: string): string {
    const profile = this.profile();
    if (!profile.interactive)
      return this.paint(
        `ARES ${this.version} | Ingeniería desde terminal\n${config.provider} / ${config.model || 'modelo sin configurar'}\n${project ? 'Proyecto: ' + project + '\n' : ''}/help para ver comandos.\n`,
        'strong',
      );
    const wide = profile.columns >= 76;
    const lines = [''];
    if (profile.columns >= 44) {
      for (const [index, line] of LOGO.entries()) {
        let metadata = '';
        if (wide && index === 1) metadata = this.paint(`     v${this.version} RELEASE`, 'strong');
        if (wide && index === 2) metadata = this.paint('     Created by AI Innovation');
        lines.push(this.paint(line, index === LOGO.length - 1 ? 'accent' : 'strong') + metadata);
      }
    } else lines.push(this.paint('  A R E S', 'strong'));
    if (!wide) {
      lines.push(this.paint(this.wrap(`v${this.version} RELEASE`), 'strong'));
      lines.push(this.paint(this.wrap('Created by AI Innovation')));
    }
    lines.push(
      this.paint(
        this.wrap('Autonomous Resilient Engineering & Software-Documentation God'),
        'muted',
      ),
      '',
    );
    lines.push(
      this.paint(
        this.wrap('[LOCAL] Terminal independiente · Historial SQLite · Cambios revisables'),
      ),
    );
    if (project) lines.push(this.paint(this.wrap('Proyecto: ' + project)));
    lines.push(
      this.paint(
        this.wrap(
          `IA: ${config.provider} / ${config.model || 'modelo sin configurar'} · conexión sin verificar`,
        ),
        'pending',
      ),
    );
    lines.push(
      this.paint(
        this.wrap('Escribe help para ver el catálogo o escribe tu consulta directamente.'),
        'muted',
      ),
      '',
    );
    return lines.join('\n') + '\n';
  }

  help(): string {
    const lines = [
      this.paint(this.wrap(`CATÁLOGO DE ÓRDENES · A.R.E.S. ${this.version}`), 'strong'),
    ];
    const wide = this.profile().columns >= 76;
    for (const [command, description] of COMMANDS) {
      if (wide) {
        const wrapped = this.wrap(description, 26).split('\n');
        lines.push(
          '  ' + this.paint(command.padEnd(24)) + this.paint(wrapped[0].slice(26), 'muted'),
        );
        lines.push(...wrapped.slice(1).map((line) => this.paint(line, 'muted')));
      } else lines.push(this.paint('  ' + command), this.paint(this.wrap(description, 4), 'muted'));
    }
    lines.push(
      '',
      this.paint(
        this.wrap(
          'Las rutas con espacios van entre comillas. Los comandos con / admiten --help. Tab completa órdenes. Ctrl+C cancela; /exit sale.',
        ),
        'muted',
      ),
    );
    return lines.join('\n') + '\n';
  }

  prompt(sessionId?: string): string {
    return (
      this.paint('ares', 'muted') +
      this.paint('@standalone') +
      (sessionId ? this.paint(` [${sessionId.slice(0, 8)}]`, 'muted') : '') +
      ':~$ '
    );
  }

  assistant(): string {
    return this.paint('ares', 'strong') + ': ';
  }

  clear(): string {
    return this.profile().controls ? '\x1b[2J\x1b[H' : '';
  }
}
