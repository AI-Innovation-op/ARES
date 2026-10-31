import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Command, CommanderError } from 'commander';
import JSZip from 'jszip';
import { createTwoFilesPatch } from 'diff';
import { Ask } from '../conversation/application/ask.js';
import { ManageProjects } from '../projects/application/manage-projects.js';
import { ChangeCode } from '../changes/application/change-code.js';
import { forgeProject } from '../engineering/application/forge.js';
import { generateDocument } from '../engineering/application/document.js';
import { inspect } from '../workspace/application/inspect.js';
import { AresError } from '../shared/domain/errors.js';
import { complete } from '../shared/application/ports.js';
import {
  loadConfiguration,
  configurationLocation,
  initializeConfiguration,
  publicConfiguration,
  requireAi,
  updateConfiguration,
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
import { SecretSafeModel } from '../infrastructure/secret-safe-model.js';
import {
  providerNames,
  providerDefinition,
  redactCredentials,
} from '../infrastructure/providers.js';

const identity = { next: randomUUID, now: () => new Date().toISOString() };
const version = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  .version as string;
type GlobalOptions = { json?: boolean; provider?: string; model?: string; project?: string };

export async function run(
  argv = process.argv,
  externalSignal?: AbortSignal,
  initialEnvironment = process.env,
): Promise<void> {
  const program = new Command();
  const originalDirectory = process.cwd();
  const location = configurationLocation(initialEnvironment, originalDirectory);
  const environment = {
    ...initialEnvironment,
    ARES_HOME: location.home,
    ...(initialEnvironment.ARES_ENV_FILE ? { ARES_ENV_FILE: location.envFile } : {}),
  };
  let projectRoot: string | undefined;
  let projectIdentity: string | undefined;
  const locationId = (root: string): string | undefined => {
    const stat = fs.statSync(root, { bigint: true });
    return stat.ino ? `${stat.dev}:${stat.ino}` : undefined;
  };
  const canonicalDirectory = (target: string): string => {
    const absolute = path.resolve(target);
    if (!fs.existsSync(absolute))
      throw new AresError('NOT_FOUND', `No existe el proyecto: ${absolute}`);
    const root = fs.realpathSync(absolute);
    if (!fs.statSync(root).isDirectory())
      throw new AresError('VALIDATION', 'El proyecto debe ser una carpeta.');
    return root;
  };
  const openProject = (target: string): string => {
    if (!target.trim()) throw new AresError('VALIDATION', 'Indica la carpeta del proyecto.');
    const registered = target.startsWith('@') ? catalog().get(target.slice(1)).data : undefined;
    const root = canonicalDirectory(registered?.root ?? target);
    if (registered && root !== registered.root)
      throw new AresError(
        'CONFLICT',
        'La ruta del alias apunta a otra ubicación. Usa projects relocate.',
      );
    const previousDirectory = process.cwd();
    const previousRoot = projectRoot,
      previousIdentity = projectIdentity;
    process.chdir(root);
    projectRoot = root;
    projectIdentity = undefined;
    try {
      config();
    } catch (error) {
      process.chdir(previousDirectory);
      projectRoot = previousRoot;
      projectIdentity = previousIdentity;
      throw error;
    }
    projectRoot = root;
    return root;
  };
  const closeProject = () => {
    process.chdir(originalDirectory);
    projectRoot = undefined;
    projectIdentity = undefined;
  };
  let store: SqliteStore | undefined;
  const workspace = new LocalWorkspace();
  let interactiveModel: string | undefined;
  let interactiveProvider: string | undefined;
  const options = () => program.opts<GlobalOptions>();
  const config = () =>
    loadConfiguration(
      {
        ...options(),
        ...(interactiveProvider
          ? { provider: interactiveProvider, model: interactiveModel }
          : interactiveModel
            ? { model: interactiveModel }
            : {}),
      },
      environment,
      process.cwd(),
      currentProject()?.data.preferences,
    );
  const operation = <T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> =>
    externalSignal ? work(externalSignal) : cancellable(work);
  const database = () => (store ??= new SqliteStore(location.home));
  const catalog = () => new ManageProjects(database().projects, identity);
  const currentProject = () => {
    if (!projectRoot) return undefined;
    const current = database().projects.byRoot(projectRoot);
    if (projectIdentity && current?.data.id !== projectIdentity)
      throw new AresError(
        'CONFLICT',
        'El proyecto se reubicó en otra terminal. Reabre su alias con /open.',
      );
    if (
      current?.data.locationId &&
      (!fs.existsSync(projectRoot) || locationId(projectRoot) !== current.data.locationId)
    )
      throw new AresError(
        'CONFLICT',
        'La carpeta registrada fue sustituida o movida. Usa projects relocate y reabre su alias.',
      );
    projectIdentity = current?.data.id;
    return current;
  };
  const model = (c = config()) => {
    requireAi(c);
    return new SecretSafeModel(new CompatibleLanguageModel(c), c.secrets);
  };
  const changes = () => new ChangeCode(database().proposals, new LocalChangeWorkspace(), identity);
  const assertProposalProject = (id: string) => {
    currentProject();
    if (projectRoot && changes().get(id).data.root !== projectRoot)
      throw new AresError(
        'CONFLICT',
        'La propuesta pertenece a otro proyecto. Abre su carpeta con --project o /open.',
      );
  };
  const context = (target?: string) => {
    const selected = target ?? projectRoot;
    return selected ? contextText(workspace.scan(path.resolve(selected))) : '';
  };
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
      cliPath: fileURLToPath(new URL('../../', import.meta.url)),
      project: projectRoot || null,
      projectProfile: currentProject()?.data || null,
      ...publicConfiguration(c),
      aiReady,
      connectionVerified: probe,
      detail,
      offlineCommands: [
        'audit',
        'analyze',
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
    const current = config();
    const ai = model(current);
    const safePrompt = redactCredentials(redact(prompt), current.secrets);
    const result = await new Ask(database().conversations, ai, identity).execute({
      prompt: safePrompt,
      project: projectRoot,
      projectId: currentProject()?.data.id,
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
    await interactiveShell(
      config(),
      {
        ask,
        history,
        sessions,
        exists: (id) => {
          const saved = database().conversations.get(id);
          saved?.assertProject(projectRoot, currentProject()?.data.id);
          return Boolean(saved);
        },
        project: () => projectRoot,
        openProject,
        closeProject,
        selection: () => {
          const selected = config();
          return { provider: selected.provider, model: selected.model };
        },
        doctor,
        setModel: (id) => {
          const selected = loadConfiguration(
            {
              ...options(),
              provider: interactiveProvider || options().provider,
              model: id,
            },
            environment,
            process.cwd(),
            currentProject()?.data.preferences,
          );
          interactiveModel = selected.model;
        },
        setProvider: (id) => {
          const selected = loadConfiguration(
            { provider: id },
            environment,
            process.cwd(),
            currentProject()?.data.preferences,
          );
          interactiveProvider = selected.provider;
          interactiveModel = selected.model;
          return selected;
        },
        execute: async (args, signal) => {
          const management = args[0] === 'projects';
          const current = management ? undefined : config();
          const previousCode = process.exitCode;
          try {
            await run(
              [
                argv[0],
                argv[1],
                ...(current
                  ? [
                      '--provider',
                      current.provider,
                      ...(current.model ? ['--model', current.model] : []),
                    ]
                  : []),
                ...(!management && projectRoot ? ['--project', projectRoot] : []),
                ...args,
              ],
              signal,
              environment,
            );
          } catch (error) {
            if (!(error instanceof CommanderError && error.exitCode === 0)) throw error;
          } finally {
            process.exitCode = previousCode;
          }
        },
      },
      version,
    );
  };

  program
    .name('ares')
    .description(
      'ARES — asistente de ingeniería CLI con dominio puro, historial local y cambios revisables.',
    )
    .version(version)
    .option('--json', 'Salida JSON sin banners; errores JSON en stderr')
    .option('-p, --provider <proveedor>', providerNames.join(', '))
    .option('-m, --model <modelo>', 'ID del modelo disponible en tu proveedor')
    .option(
      '-C, --project <carpeta-o-alias>',
      'Abrir carpeta o @alias; rutas relativas y contexto usan este proyecto',
    )
    .showHelpAfterError()
    .exitOverride();
  program.hook('preAction', () => {
    if (options().project !== undefined) openProject(options().project!);
  });
  const projects = program
    .command('projects')
    .description('Registrar alias, preferencias y reubicación de proyectos');
  const listProjects = () => {
    const data = database()
      .projects.list()
      .map((project) => ({
        ...project,
        available: fs.existsSync(project.root),
      }));
    output(
      data,
      data.length
        ? data
            .map((p) => `@${p.alias}  ${p.root}${p.available ? '' : ' [no disponible]'}`)
            .join('\n')
        : 'No hay proyectos registrados. Usa projects add ALIAS RUTA.',
    );
  };
  projects.action(listProjects);
  projects.command('list').action(listProjects);
  projects.command('show <alias>').action((alias) => {
    const data = catalog().get(alias).data;
    output(
      data,
      `@${data.alias}\nProyecto: ${data.root}\nID: ${data.id}\nIA: ${data.preferences ? data.preferences.provider + ' / ' + data.preferences.model : 'configuración general'}`,
    );
  });
  projects
    .command('add <alias> [carpeta]')
    .description('Registrar una carpeta y vincular sus sesiones anteriores')
    .action((alias, target = '.') => {
      const root = canonicalDirectory(target);
      const result = catalog().register(alias, root, locationId(root));
      output(
        result,
        `Proyecto registrado: @${result.project.alias}\nCarpeta: ${root}\nSesiones vinculadas: ${result.linkedSessions}\nAbrir: ares --project "@${alias}"`,
      );
    });
  projects
    .command('configure <alias>')
    .option('--provider <proveedor>', 'Proveedor preferido para este proyecto')
    .option('--model <modelo>', 'Modelo del proveedor elegido')
    .option('--reset', 'Retirar las preferencias y usar configuración general')
    .action((alias, opts) => {
      const provider = opts.provider ?? options().provider;
      const selectedModel = opts.model ?? options().model;
      if (
        opts.reset
          ? provider !== undefined || selectedModel !== undefined
          : !provider || !selectedModel
      )
        throw new AresError('VALIDATION', 'Usa --provider y --model juntos, o --reset.');
      if (!opts.reset) providerDefinition(provider!);
      const data = catalog().configure(
        alias,
        opts.reset ? undefined : { provider: provider!, model: selectedModel! },
      );
      output(data, `Perfil actualizado: @${alias}`);
    });
  projects
    .command('relocate <alias> <carpeta>')
    .description('Vincular la nueva ubicación; no mueve archivos')
    .action((alias, target) => {
      const before = catalog().get(alias).data;
      const root = canonicalDirectory(target);
      if (
        before.root !== root &&
        fs.existsSync(before.root) &&
        (!before.locationId || locationId(before.root) === before.locationId)
      )
        throw new AresError(
          'CONFLICT',
          'La carpeta original todavía existe. Muévela primero; relocate no copia ni mueve archivos.',
        );
      const data = catalog().relocate(alias, root, locationId(root));
      output(
        data,
        `Proyecto reubicado: @${alias}\nCarpeta: ${root}\nLas conversaciones conservan su identidad. Las propuestas anteriores mantienen su raíz original.`,
      );
    });
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
  program
    .command('providers')
    .description('Proveedores y perfiles locales; no comprueba la conexión')
    .action(() => {
      const rows = providerNames.map((provider) => {
        const c = loadConfiguration({ provider });
        return {
          provider,
          active: config().provider === provider,
          model: c.model || null,
          credentialConfigured: Boolean(c.apiKey),
          endpoint: c.baseUrl,
        };
      });
      output(
        rows,
        rows
          .map(
            (row) =>
              `${row.active ? '*' : ' '} ${row.provider.padEnd(11)} ${row.credentialConfigured ? 'clave guardada' : row.provider === 'compatible' ? 'clave opcional' : 'sin clave'} | ${row.model || 'modelo sin configurar'}`,
          )
          .join('\n') +
          '\n* Proveedor activo. Las claves y perfiles no acreditan acceso o cuota; usa doctor --probe.',
      );
    });
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
      await operation((signal) => ask(prompt, opts.session, opts.context ?? projectRoot, signal));
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
        readStdin().then((prompt) => ask(prompt, undefined, projectRoot, signal)),
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

  configuration
    .command('set')
    .description('Actualizar la configuración personal; claves solo por stdin')
    .option('--base-url <url>', 'Endpoint para el proveedor compatible')
    .option('--key-stdin', 'Leer la clave de stdin; nunca como argumento')
    .action(async (opts) => {
      if (
        options().provider === undefined &&
        options().model === undefined &&
        opts.baseUrl === undefined &&
        !opts.keyStdin
      )
        throw new AresError('VALIDATION', 'Indica --provider, --model, --base-url o --key-stdin.');
      const apiKey = opts.keyStdin ? await readStdin() : undefined;
      const written = updateConfiguration(
        {
          provider: options().provider,
          model: options().model,
          baseUrl: opts.baseUrl,
          apiKey,
        },
        environment,
      );
      output(
        publicConfiguration(written),
        `Configuración actualizada: ${written.envFile}\nLas variables del proceso o del proyecto tienen precedencia. Verifica con ares doctor --probe.`,
      );
    });

  program
    .command('setup')
    .description('Configurar proveedor, modelo y clave mediante entrada oculta')
    .action(async () => {
      if (options().json)
        throw new AresError('VALIDATION', 'Para automatizar usa config set --key-stdin --json.');
      const { setupConfiguration } = await import('./setup.js');
      const selected = await operation((signal) => setupConfiguration(signal, environment));
      output(
        publicConfiguration(selected),
        'Configuración lista. Comprueba la conexión con ares doctor --probe.',
      );
    });

  program
    .command('analyze [ruta]')
    .description('Analizar imports, límites de capas y ciclos con AST de JS/TS/Vue; sin IA')
    .option('--fail-on <criterio>', 'Devolver error por violation, cycle, parse o any')
    .option('-o, --output <archivo>', 'Nuevo informe Markdown o JSON con --json')
    .action(async (target = '.', opts) => {
      if (opts.failOn && !['violation', 'cycle', 'parse', 'any'].includes(opts.failOn))
        throw new AresError('VALIDATION', '--fail-on admite violation, cycle, parse o any.');
      const snapshot = workspace.scan(path.resolve(target));
      const [{ AnalyzeArchitecture }, { TypeScriptImports }] = await Promise.all([
        import('../architecture/application/analyze-architecture.js'),
        import('../infrastructure/typescript-imports.js'),
      ]);
      const report = new AnalyzeArchitecture(new TypeScriptImports()).execute(snapshot);
      const markdown = [
        `# Arquitectura observada\n\nProyecto: ${report.root}`,
        `Módulos analizados: ${report.analyzedModules} | Archivos omitidos: ${report.skipped}${report.truncated ? ' | Instantánea limitada' : ''}`,
        ...report.contexts.map(
          (c) =>
            `- Contexto ${c.name}: ${c.modules} módulos (${Object.entries(c.layers)
              .map(([layer, count]) => `${layer}: ${count}`)
              .join(', ')})`,
        ),
        '\n## Hallazgos',
        ...report.violations.map(
          (v) => `- ${v.path}:${v.line} [${v.rule}] ${v.message} Import: ${v.dependency}`,
        ),
        ...report.cycles.map((cycle) => `- Grupo cíclico: ${cycle.join(', ')}`),
        ...report.parseIssues.map((issue) => `- ${issue.path}:${issue.line} ${issue.message}`),
        ...report.unresolved.map(
          (d) => `- Resolución pendiente en la instantánea: ${d.path}:${d.line} (${d.specifier})`,
        ),
        ...report.unsupportedFiles.map((file) => `- Lenguaje no analizado: ${file}`),
        report.violations.length +
        report.cycles.length +
        report.parseIssues.length +
        report.unresolved.length +
        report.unsupportedFiles.length
          ? ''
          : 'Sin coincidencias para las reglas aplicadas.',
        '\n## Límites',
        ...report.limitations.map((line) => '- ' + line),
      ]
        .filter(Boolean)
        .join('\n');
      if (opts.output) {
        const file = saveOutput(
          opts.output,
          options().json ? JSON.stringify(report, null, 2) + '\n' : markdown + '\n',
        );
        output({
          file,
          analyzedModules: report.analyzedModules,
          violations: report.violations.length,
          cycles: report.cycles.length,
        });
      } else output(report, markdown);
      const failed =
        ((opts.failOn === 'violation' || opts.failOn === 'any') && report.violations.length > 0) ||
        ((opts.failOn === 'cycle' || opts.failOn === 'any') && report.cycles.length > 0) ||
        ((opts.failOn === 'parse' || opts.failOn === 'any') && report.parseIssues.length > 0) ||
        (opts.failOn === 'any' &&
          (report.analyzedModules === 0 || report.truncated || report.unresolved.length > 0));
      if (failed) process.exitCode = 1;
    });

  const savedSessions = program
    .command('sessions')
    .description('Consultar y exportar conversaciones (últimas 50)');
  savedSessions.command('list').action(sessions);
  savedSessions
    .command('search <consulta...>')
    .option('--limit <numero>', 'Máximo de resultados entre 1 y 50', '20')
    .description('Buscar palabras en títulos, consultas y respuestas locales')
    .action((parts: string[], opts) => {
      const records = database().conversations.search(parts.join(' '), Number(opts.limit));
      output(
        records,
        records.length
          ? records.map((record) => `${record.id}\n${record.title}\n${record.excerpt}`).join('\n\n')
          : 'No hay coincidencias.',
      );
    });
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
      const secrets = config().secrets;
      for (const file of snapshot.files)
        zip.file(file.path, redactCredentials(redact(file.content), secrets));
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
      assertProposalProject(id);
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
      assertProposalProject(id);
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
      if (proposalId) assertProposalProject(proposalId);
      const service = new VerifyProject(
        new NodeProjectChecks(config().secrets),
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
      new NodeProjectChecks(config().secrets),
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
    if (fs.existsSync(originalDirectory)) process.chdir(originalDirectory);
  }
}
