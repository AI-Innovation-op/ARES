import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Command, CommanderError } from 'commander';
import JSZip from 'jszip';
import { createTwoFilesPatch } from 'diff';
import { Ask } from '../conversation/application/ask.js';
import { ChangeCode } from '../changes/application/change-code.js';
import { forgeProject } from '../engineering/application/forge.js';
import { generateDocument } from '../engineering/application/document.js';
import { inspect } from '../workspace/application/inspect.js';
import { AresError } from '../shared/domain/errors.js';
import { complete } from '../shared/application/ports.js';
import {
  loadConfiguration,
  initializeConfiguration,
  publicConfiguration,
  requireAi,
} from '../infrastructure/configuration.js';
import { CompatibleLanguageModel } from '../infrastructure/language-model.js';
import { LocalWorkspace, readCurrent, hash } from '../infrastructure/workspace.js';
import { LocalChangeWorkspace } from '../infrastructure/change-workspace.js';
import { SqliteStore } from '../infrastructure/sqlite-store.js';
import { contextText, redact, terminalText } from '../infrastructure/text.js';
import { cancellable, diagnostic, print, readStdin, saveOutput } from './output.js';
import { interactiveShell } from './repl.js';
import { VerifyProject } from '../verification/application/verify-project.js';
import { NodeProjectChecks } from '../infrastructure/project-checks.js';
import { listModels } from '../infrastructure/model-catalog.js';
import { selectContext } from '../infrastructure/text.js';

const identity = { next: randomUUID, now: () => new Date().toISOString() };
const version = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  .version as string;
type GlobalOptions = { json?: boolean; provider?: string; model?: string };

export async function run(argv = process.argv, externalSignal?: AbortSignal): Promise<void> {
  const program = new Command();
  let store: SqliteStore | undefined;
  const workspace = new LocalWorkspace();
  let interactiveModel: string | undefined;
  const options = () => program.opts<GlobalOptions>();
  const config = () =>
    loadConfiguration({ ...options(), ...(interactiveModel ? { model: interactiveModel } : {}) });
  const operation = <T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> =>
    externalSignal ? work(externalSignal) : cancellable(work);
  const database = () => (store ??= new SqliteStore(config().home));
  const model = () => {
    const c = config();
    requireAi(c);
    return new CompatibleLanguageModel(c);
  };
  const changes = () => new ChangeCode(database().proposals, new LocalChangeWorkspace(), identity);
  const context = (target?: string) =>
    target ? contextText(workspace.scan(path.resolve(target))) : '';
  const output = (value: unknown, text?: string) => print(value, Boolean(options().json), text);
  const session = (id: string) => {
    const result = database().conversations.get(id);
    if (!result) throw new AresError('NOT_FOUND', `Sesión no encontrada: ${id}`);
    return result.data;
  };
  const history = (id: string) => {
    const data = session(id);
    output(
      data,
      data.turns
        .map((turn) => `Tú: ${turn.prompt}\n\nARES (${turn.model}): ${turn.answer}`)
        .join('\n\n---\n\n'),
    );
  };
  const sessions = () => {
    const data = database().conversations.list();
    output(
      data,
      data.length
        ? data.map((s) => `${s.id}  ${s.revision} turnos  ${s.title}`).join('\n')
        : 'No hay sesiones guardadas.',
    );
  };
  const doctor = async (probe = false) => {
    const c = config();
    let aiReady = true,
      detail = 'Configuración de IA disponible; conexión sin verificar.';
    try {
      requireAi(c);
    } catch (error) {
      aiReady = false;
      detail = (error as Error).message;
    }
    if (probe) {
      requireAi(c);
      await operation((signal) =>
        complete(model(), [{ role: 'user', content: 'Responde únicamente OK.' }], signal),
      );
      detail = 'Solicitud de IA completada con el proveedor configurado.';
    }
    const data = {
      version,
      node: process.version,
      ...publicConfiguration(c),
      aiReady,
      connectionVerified: probe,
      detail,
      offlineCommands: [
        'audit',
        'context',
        'forge',
        'zip',
        'diff',
        'apply',
        'restore',
        'verify',
        'verifications',
        'sessions',
      ],
    };
    output(
      data,
      `ARES ${version} | Node ${process.version}\nProveedor: ${c.provider}\nModelo: ${c.model || '(sin configurar)'}\nConfiguración: ${c.envFile}\n${detail}\n\nDisponibles sin IA: ${data.offlineCommands.join(', ')}.`,
    );
  };
  const ask = async (prompt: string, sessionId?: string, target?: string, signal?: AbortSignal) => {
    const ai = model();
    const result = await new Ask(database().conversations, ai, identity).execute({
      prompt: redact(prompt),
      sessionId,
      context: target ? contextText(workspace.scan(path.resolve(target)), 100_000, prompt) : '',
      signal,
      onDelta: options().json
        ? undefined
        : (text) => process.stdout.write(terminalText(redact(text))),
    });
    if (options().json) output(result);
    else {
      process.stdout.write('\n');
      diagnostic(`Sesión: ${result.id}`);
    }
    return result.id;
  };
  const shell = async () => {
    if (options().json)
      throw new AresError('VALIDATION', '--json requiere un comando; usa ares ask --json.');
    await interactiveShell(config(), {
      ask,
      history,
      sessions,
      exists: (id) => Boolean(database().conversations.get(id)),
      doctor,
      setModel: (id) => {
        const selected = loadConfiguration({ ...options(), model: id });
        interactiveModel = selected.model;
      },
      execute: async (args, signal) => {
        const current = config();
        const previousCode = process.exitCode;
        try {
          await run(
            [
              argv[0],
              argv[1],
              '--provider',
              current.provider,
              ...(current.model ? ['--model', current.model] : []),
              ...args,
            ],
            signal,
          );
        } catch (error) {
          if (!(error instanceof CommanderError && error.exitCode === 0)) throw error;
        } finally {
          process.exitCode = previousCode;
        }
      },
    });
  };

  program
    .name('ares')
    .description(
      'ARES — asistente de ingeniería CLI con dominio puro, historial local y cambios revisables.',
    )
    .version(version)
    .option('--json', 'Salida JSON sin banners; errores JSON en stderr')
    .option('-p, --provider <proveedor>', 'openrouter, gemini o compatible')
    .option('-m, --model <modelo>', 'ID del modelo disponible en tu proveedor')
    .showHelpAfterError()
    .exitOverride();
  program.configureOutput({
    writeErr: (text) => {
      if (!argv.includes('--json')) process.stderr.write(text);
    },
  });

  program
    .command('doctor')
    .description('Diagnóstico local; --probe realiza una consulta real al proveedor')
    .option('--probe', 'Verificar la conexión con una consulta breve de IA')
    .action(async (opts) => doctor(Boolean(opts.probe)));
  const configuration = program
    .command('config')
    .description('Configuración local, sin exponer claves');
  configuration.command('show').action(() => output(publicConfiguration(config())));
  configuration
    .command('init')
    .description('Crear plantilla .env privada sin sobrescribir la existente')
    .action(() => {
      const file = initializeConfiguration(config());
      output(
        { file },
        `Configuración creada: ${file}\nEdita ARES_MODEL y la clave localmente; verifica con ares doctor --probe.`,
      );
    });

  program
    .command('ask')
    .alias('chat')
    .description('Conversar directamente con IA; acepta texto por stdin')
    .argument('[consulta...]')
    .option('-s, --session <id>', 'Continuar una sesión')
    .option('-c, --context <ruta>', 'Adjuntar contexto local filtrado')
    .action(async (parts: string[], opts) => {
      const prompt = parts.length ? parts.join(' ') : await readStdin();
      await operation((signal) => ask(prompt, opts.session, opts.context, signal));
    });
  program
    .command('repl')
    .aliases(['shell', 'interactive'])
    .description('Conversación interactiva con autocompletado e historial')
    .action(shell);
  program.action(async () => {
    if (process.stdin.isTTY) await shell();
    else
      await operation((signal) =>
        readStdin().then((prompt) => ask(prompt, undefined, undefined, signal)),
      );
  });

  program
    .command('models')
    .description('Consultar el catálogo actual del proveedor; no requiere seleccionar modelo')
    .option('--filter <texto>', 'Filtrar por ID o nombre')
    .option('--limit <numero>', 'Máximo de resultados entre 1 y 20000', '50')
    .action(async (opts) => {
      const limit = Number(opts.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 20_000)
        throw new AresError('VALIDATION', '--limit debe estar entre 1 y 20000.');
      const all = await operation((signal) => listModels(config(), signal));
      const matching = opts.filter
        ? all.filter((m) =>
            `${m.id} ${m.name}`.toLowerCase().includes(String(opts.filter).toLowerCase()),
          )
        : all;
      const selected = matching.slice(0, limit);
      output(
        {
          provider: config().provider,
          total: all.length,
          matching: matching.length,
          models: selected,
        },
        `${selected.map((m) => `${m.id}  ${m.name}`).join('\n')}\n${selected.length} de ${matching.length} coincidencias. El catálogo no garantiza acceso ni cuota; comprueba con doctor --probe.`,
      );
    });

  const savedSessions = program
    .command('sessions')
    .description('Consultar y exportar conversaciones (últimas 50)');
  savedSessions.command('list').action(sessions);
  savedSessions.command('show <id>').action(history);
  savedSessions
    .command('export <id>')
    .requiredOption('-o, --output <archivo>', 'Nuevo archivo Markdown')
    .action((id, opts) => {
      const data = session(id);
      const markdown =
        `# ${data.title}\n\nSesión: ${data.id}\n\n` +
        data.turns
          .map((t) => `## Tú\n\n${t.prompt}\n\n## ARES (${t.model})\n\n${t.answer}\n`)
          .join('\n---\n\n');
      const file = saveOutput(opts.output, markdown);
      output({ file }, `Historial exportado: ${file}`);
    });

  program
    .command('context [ruta]')
    .description('Mostrar qué fuentes pueden enviarse a IA; nunca realiza una solicitud')
    .option('--content', 'Incluir el contenido redactado')
    .action((target = '.', opts) => {
      const snapshot = workspace.scan(path.resolve(target));
      const selected = selectContext(snapshot);
      const data = {
        root: snapshot.root,
        files: snapshot.files.map((f) => ({
          path: f.path,
          bytes: Buffer.byteLength(f.content),
          hash: f.hash,
          selected: selected.includedPaths.includes(f.path),
        })),
        skipped: snapshot.skipped,
        truncated: snapshot.truncated,
        omittedFromAi: selected.omittedPaths,
        ...(opts.content ? { context: selected.text } : {}),
      };
      output(data);
    });

  program
    .command('audit [ruta]')
    .description('Inspección estática local; --ai añade revisión del proveedor')
    .option('--ai', 'Enviar el contexto filtrado para análisis de IA')
    .option('--fail-on <nivel>', 'Salir con código 1 si hay hallazgos: high o medium')
    .action(async (target = '.', opts) => {
      if (opts.failOn && !['high', 'medium'].includes(opts.failOn))
        throw new AresError('VALIDATION', '--fail-on admite high o medium.');
      const snapshot = workspace.scan(path.resolve(target));
      const report = inspect(snapshot);
      const aiReview = opts.ai
        ? await operation((signal) =>
            generateDocument(
              model(),
              'rfc',
              'Revisa el código con foco en defectos, límites de dominio y riesgos verificables. Cita rutas y líneas; no reescribas código.',
              contextText(snapshot),
              signal,
            ),
          )
        : undefined;
      output(
        { ...report, ...(aiReview ? { aiReview } : {}) },
        [
          `Inspeccionados: ${report.files} archivos | Omitidos: ${snapshot.skipped}${snapshot.truncated ? ' | Contexto limitado' : ''}`,
          ...report.findings.map(
            (f) => `[${f.severity}] ${f.path}:${f.line} ${f.rule}: ${f.message}`,
          ),
          report.findings.length ? '' : 'Sin coincidencias para las reglas habilitadas.',
          ...report.limitations,
          aiReview || '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
      if (
        opts.failOn &&
        report.findings.some((f) => opts.failOn === 'medium' || f.severity === 'high')
      )
        process.exitCode = 1;
    });

  program
    .command('doc <tipo> [instruccion...]')
    .description('Generar readme, adr, rfc, openapi o c4 con IA')
    .option('-c, --context <ruta>', 'Contexto local')
    .option('-o, --output <archivo>', 'Nuevo archivo de salida')
    .action(async (type, parts: string[], opts) => {
      const text = await operation((signal) =>
        generateDocument(
          model(),
          type.toLowerCase(),
          redact(parts.join(' ') || `Documenta el proyecto: ${type}.`),
          context(opts.context || '.'),
          signal,
        ),
      );
      if (opts.output) {
        const file = saveOutput(opts.output, text);
        output({ file, type }, `Documento guardado: ${file}`);
      } else output({ type, content: text }, text);
    });
  program
    .command('test <archivo>')
    .description('Proponer tests de un archivo con IA (no los ejecuta)')
    .option('-f, --framework <nombre>', 'Framework a utilizar', 'node:test')
    .option('-o, --output <archivo>', 'Nuevo archivo de salida')
    .action(async (file, opts) => {
      const text = await operation((signal) =>
        generateDocument(
          model(),
          'tests',
          `Genera tests significativos con ${opts.framework}. Incluye casos límite y las invariantes del código; no alteres la implementación.`,
          context(file),
          signal,
        ),
      );
      if (opts.output) {
        const saved = saveOutput(opts.output, text);
        output({ file: saved, executed: false }, `Tests propuestos (sin ejecutar): ${saved}`);
      } else output({ content: text, executed: false }, text);
    });

  program
    .command('forge <directorio>')
    .alias('new')
    .description('Crear una CLI DDD de ejemplo funcional, con SQLite y tests; sin IA')
    .option('-n, --name <nombre>', 'Nombre descriptivo')
    .option('--context <identificador>', 'Nombre del contexto de tareas', 'tasks')
    .action((directory, opts) => {
      const destination = path.resolve(directory);
      if (fs.existsSync(destination))
        throw new AresError('CONFLICT', 'El destino ya existe; elige una carpeta nueva.');
      const files = forgeProject(opts.name || path.basename(destination), opts.context);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const staging = path.join(path.dirname(destination), `.ares-forge-${randomUUID()}`);
      fs.mkdirSync(staging);
      try {
        for (const [name, content] of Object.entries(files)) {
          const full = path.join(staging, name);
          fs.mkdirSync(path.dirname(full), { recursive: true });
          fs.writeFileSync(full, content, { flag: 'wx' });
        }
        if (fs.existsSync(destination))
          throw new AresError('CONFLICT', 'El destino fue creado por otro proceso.');
        fs.renameSync(staging, destination);
      } finally {
        if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
      }
      output(
        {
          directory: destination,
          files: Object.keys(files),
          template: 'task-tracking-ddd',
          aiGenerated: false,
        },
        `Proyecto creado: ${destination}\n\ncd "${destination}"\nnode src/main.ts add "Mi primera tarea"\nnode src/main.ts list\nnode --test test/*.test.ts`,
      );
    });

  program
    .command('zip <directorio> [salida]')
    .description('Empaquetar fuentes filtradas; excluye claves, ignorados, binarios y enlaces')
    .action(async (directory, target) => {
      const snapshot = workspace.scan(path.resolve(directory));
      if (snapshot.truncated)
        throw new AresError(
          'VALIDATION',
          'El proyecto supera el límite de lectura; no se creará un ZIP incompleto.',
        );
      const zip = new JSZip();
      for (const file of snapshot.files) zip.file(file.path, redact(file.content));
      const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      const file = saveOutput(target || `${path.basename(snapshot.root)}-sources.zip`, buffer);
      output(
        {
          file,
          files: snapshot.files.length,
          skipped: snapshot.skipped,
          redacted: true,
          bytes: buffer.length,
        },
        `Fuentes empaquetadas: ${file}\n${snapshot.files.length} archivos; ${snapshot.skipped} entradas omitidas. Posibles secretos redactados.`,
      );
    });

  program
    .command('propose [instruccion...]')
    .description('Crear propuesta revisable sin modificar el proyecto')
    .option('--path <directorio>', 'Proyecto objetivo', '.')
    .option('--from <archivo>', 'Importar JSON local {summary, changes:[{path, content}]} sin IA')
    .action(async (parts: string[], opts) => {
      if (!fs.statSync(path.resolve(opts.path)).isDirectory())
        throw new AresError('VALIDATION', '--path debe indicar un directorio de proyecto.');
      const snapshot = workspace.scan(path.resolve(opts.path));
      const service = changes();
      let result;
      if (opts.from) {
        const file = path.resolve(opts.from);
        if (fs.statSync(file).size > 1_000_000)
          throw new AresError('VALIDATION', 'El JSON supera 1 MB.');
        let payload: unknown;
        try {
          payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
          throw new AresError('VALIDATION', 'El archivo de propuesta no contiene JSON válido.');
        }
        result = service.create(
          snapshot,
          parts.join(' ') || 'Propuesta importada por el usuario',
          payload,
        );
      } else {
        const selected = selectContext(snapshot, 100_000, parts.join(' '));
        const permitted = {
          ...snapshot,
          files: snapshot.files.filter((file) => selected.includedPaths.includes(file.path)),
        };
        result = await operation((signal) =>
          service.generate(model(), permitted, redact(parts.join(' ')), selected.text, signal),
        );
      }
      output(
        result,
        `Propuesta ${result.id}\n${result.summary}\nArchivos: ${result.changes.length}\n\nares diff ${result.id}\nares apply ${result.id}\nares restore ${result.id}`,
      );
    });
  program
    .command('proposals')
    .description('Listar las últimas 50 propuestas')
    .action(() => output(database().proposals.list()));
  program
    .command('diff <id>')
    .description('Revisar diferencias y detectar divergencias del proyecto')
    .action((id) => {
      const proposal = changes().get(id).data;
      const divergences: string[] = [];
      const result = proposal.changes
        .map((change) => {
          const current = readCurrent(proposal.root, change.path);
          const currentHash = current === null ? null : hash(current);
          if (
            (proposal.status === 'proposed' && currentHash !== change.beforeHash) ||
            (proposal.status === 'applied' && current !== change.after)
          )
            divergences.push(change.path);
          const before = Object.prototype.hasOwnProperty.call(proposal.backups, change.path)
            ? proposal.backups[change.path]
            : current;
          return createTwoFilesPatch(
            `a/${change.path}`,
            `b/${change.path}`,
            before ?? '',
            change.after ?? '',
            '',
            '',
            { context: 3 },
          );
        })
        .join('\n');
      output(
        {
          id,
          status: proposal.status,
          root: proposal.root,
          summary: proposal.summary,
          divergences,
          diff: result,
        },
        `Propuesta ${id} [${proposal.status}]\n${proposal.summary}\nProyecto: ${proposal.root}\n${divergences.length ? `Archivos con cambios posteriores: ${divergences.join(', ')}. La aplicación o restauración se detendrá.\n` : ''}\n${result}`,
      );
    });
  program
    .command('apply <id>')
    .description('Aplicar una propuesta con control de hash y diario de recuperación')
    .action((id) => {
      const result = changes().apply(id);
      output(
        { id, status: result.status },
        `Propuesta aplicada: ${id}\nRestaurar: ares restore ${id}`,
      );
    });
  program
    .command('restore <id>')
    .description('Restaurar copias; detenerse si hay ediciones posteriores')
    .action((id) => {
      const result = changes().restore(id);
      output({ id, status: result.status }, `Contenido original restaurado: ${id}`);
    });

  program
    .command('verify [propuesta]')
    .description(
      'Ejecutar un script del proyecto y guardar evidencia real; requiere confiar en ese script',
    )
    .option('--path <directorio>', 'Proyecto objetivo cuando no se indica propuesta', '.')
    .option('--script <nombre>', 'Script exacto de package.json; sin hooks pre/post', 'test')
    .option('--timeout <ms>', 'Timeout de 100 a 600000 ms', '120000')
    .action(async (proposalId, opts) => {
      const service = new VerifyProject(
        new NodeProjectChecks(),
        database().verifications,
        database().proposals,
        new LocalChangeWorkspace(),
        identity,
      );
      if (!options().json) diagnostic(`Ejecutando script ${opts.script}...`);
      const result = await operation((signal) =>
        service.execute({
          root: path.resolve(opts.path),
          script: opts.script,
          proposalId,
          timeoutMs: Number(opts.timeout),
          signal,
        }),
      );
      output(
        result,
        `Verificación ${result.id}: ${result.status}\nProyecto: ${result.root}\nScript: ${result.script}\nDuración: ${result.durationMs} ms | Salida: ${result.exitCode ?? result.signal ?? result.status}\n${result.stdout}${result.stderr ? '\n' + result.stderr : ''}${result.outputTruncated ? '\nSalida limitada a los últimos 32000 caracteres por canal.' : ''}${result.stateChanged ? '\nLas fuentes o la propuesta cambiaron durante la ejecución; esta evidencia no aprueba el estado actual.' : ''}`,
      );
      if (result.status !== 'passed') process.exitCode = result.status === 'cancelled' ? 130 : 1;
    });
  const checks = program
    .command('verifications')
    .description('Consultar evidencia de scripts ejecutados');
  checks
    .command('list')
    .option('--proposal <id>', 'Filtrar por propuesta')
    .action((opts) => {
      const data = database()
        .verifications.list(opts.proposal)
        .map(({ stdout: _out, stderr: _err, ...summary }) => summary);
      output(data);
    });
  checks.command('show <id>').action((id) => {
    const record = database().verifications.get(id);
    if (!record) throw new AresError('NOT_FOUND', `Verificación no encontrada: ${id}`);
    const service = new VerifyProject(
      new NodeProjectChecks(),
      database().verifications,
      database().proposals,
      new LocalChangeWorkspace(),
      identity,
    );
    output({ ...record.data, ...service.assess(record.data) });
  });

  try {
    await program.parseAsync(argv);
  } finally {
    store?.close();
  }
}
