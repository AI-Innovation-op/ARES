/**
 * @fileoverview Autómata Git Soberano para Commits Atómicos por Bounded Context (v3.5).
 * Realiza la división de artefactos en commits atómicos con atribución de autor
 * (--author="Nombre <correo@github.com>"), generación de scripts tácticos (.bat / .sh)
 * y ejecución autónoma en repositorio local o push remoto a GitHub.
 * @module services/git-automator.service
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import crypto from 'node:crypto';
import {
  resolverRutaSegura,
  validarNombreRama,
  validarRemoteUrl,
  validarTokenGithub,
  validarNombrePersona,
  validarEmail,
  validarAutorGit,
  validarMensajeCommit,
} from '../utils/validacion.js';
import { ValidationError } from '../middleware/error.middleware.js';
import { VERSION } from '../config/version.js';

const execFileAsync = promisify(execFile);

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedContexts?: string[];
  color?: string;
}

export interface MetricaContribucionEquipo {
  miembro: TeamMember;
  commitsAsignados: number;
  porcentaje: number;
  boundedContexts: string[];
}

export interface GitAuthorConfig {
  name: string;
  email: string;
  branchName?: string;
  remoteUrl?: string;
  githubToken?: string;
  teamMembers?: TeamMember[];
}

export interface CommitSlice {
  id: string;
  orden: number;
  mensaje: string;
  tipo: 'chore' | 'feat' | 'test' | 'docs';
  boundedContext?: string;
  archivos: string[];
  autor: string;
  autorNombre?: string;
  autorEmail?: string;
}

export interface ArchivoGenerado {
  ruta: string;
  contenido: string;
}

export interface PlanGitCommits {
  branchName: string;
  autor: GitAuthorConfig;
  commits: CommitSlice[];
  metricasEquipo?: MetricaContribucionEquipo[];
  scripts: {
    bat: string;
    sh: string;
  };
}

export interface ResultadoGitPush {
  exitoso: boolean;
  commitsEjecutados: number;
  rama: string;
  remoteUrl?: string;
  logs: string[];
  error?: string;
  commitHashes: string[];
}

export class GitAutomatorService {
  /**
   * Planifica la secuencia de commits atómicos dividida por capas y Bounded Contexts.
   */
  static planificarCommits(
    archivos: ArchivoGenerado[],
    autor: GitAuthorConfig,
    boundedContexts: string[] = []
  ): PlanGitCommits {
    const branchName = autor.branchName || `feature/${(boundedContexts[0] || 'ddd-architecture').toLowerCase()}`;
    const commits: CommitSlice[] = [];
    let orden = 1;

    // Resolver autor de commit (soporta Comandante único o Squad Multi-Contributor)
    const team = autor.teamMembers && autor.teamMembers.length > 0 ? autor.teamMembers : null;
    const defaultAuthor = {
      name: autor.name,
      email: autor.email,
      string: `${autor.name} <${autor.email}>`,
    };

    const resolverAutor = (ctx?: string, tipo?: 'chore' | 'feat' | 'test' | 'docs') => {
      if (!team || team.length === 0) {
        return defaultAuthor;
      }

      // 1. Si es un contexto delimitado específico, verificar si un miembro lo tiene asignado
      if (ctx && ctx !== 'shared') {
        const miembroAsignado = team.find((m) =>
          m.assignedContexts?.some((ac) => ac.toLowerCase() === ctx.toLowerCase())
        );
        if (miembroAsignado) {
          return {
            name: miembroAsignado.name,
            email: miembroAsignado.email,
            string: `${miembroAsignado.name} <${miembroAsignado.email}>`,
          };
        }
      }

      // 2. Si es scaffolding inicial o shared kernel, asignar al Tech Lead (miembro 0)
      if (tipo === 'chore' || ctx === 'shared') {
        const lead = team[0];
        return {
          name: lead.name,
          email: lead.email,
          string: `${lead.name} <${lead.email}>`,
        };
      }

      // 3. Si es documentación final, asignar al Tech Lead
      if (tipo === 'docs') {
        const lead = team[0];
        return {
          name: lead.name,
          email: lead.email,
          string: `${lead.name} <${lead.email}>`,
        };
      }

      // 4. Si el contexto no tiene miembro asignado, distribuir equitativamente (round-robin por hash de contexto)
      if (ctx) {
        const hash = Math.abs(ctx.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0));
        const idx = hash % team.length;
        const miembroElegido = team[idx] || team[0];
        return {
          name: miembroElegido.name,
          email: miembroElegido.email,
          string: `${miembroElegido.name} <${miembroElegido.email}>`,
        };
      }

      return defaultAuthor;
    };

    // Rutas de archivos normalizadas
    const rutasDisponibles = archivos.map((a) => a.ruta.replace(/\\/g, '/'));

    // 1. Commit Inicial: Scaffold & Configuración
    const archivosScaffold = rutasDisponibles.filter((r) =>
      /^(?:package\.json|tsconfig\.json|\.gitignore|\.env\.example|SPECIFICATION\.md|setup-git\.(?:bat|sh))$/i.test(
        r
      )
    );
    if (archivosScaffold.length > 0) {
      const a = resolverAutor(undefined, 'chore');
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'chore',
        mensaje: 'chore(scaffold): initial project setup, environment configuration and tactical specs',
        archivos: archivosScaffold,
        autor: a.string,
        autorNombre: a.name,
        autorEmail: a.email,
      });
    }

    // 2. Commit Shared Kernel: Objetos base y eventos transversales
    const archivosShared = rutasDisponibles.filter((r) => r.includes('src/shared/') || r.includes('shared/'));
    if (archivosShared.length > 0) {
      const a = resolverAutor('shared', 'feat');
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'feat',
        boundedContext: 'shared',
        mensaje: 'feat(shared-kernel): domain events, base value objects and aggregate root contracts',
        archivos: archivosShared,
        autor: a.string,
        autorNombre: a.name,
        autorEmail: a.email,
      });
    }

    // 3. Commits por Bounded Context
    const contextosDetectados = new Set<string>(boundedContexts.map((c) => c.toLowerCase()));

    // Detectar contextos a partir de la estructura de carpetas src/<context>/...
    for (const r of rutasDisponibles) {
      const match = r.match(/^src\/([a-zA-Z0-9_-]+)\//i);
      if (match && match[1] && match[1] !== 'shared') {
        contextosDetectados.add(match[1].toLowerCase());
      }
    }

    for (const ctx of contextosDetectados) {
      const aCtx = resolverAutor(ctx, 'feat');
      const aTest = resolverAutor(ctx, 'test');

      // 3.1 Dominio del contexto
      const archivosDominio = rutasDisponibles.filter(
        (r) => r.toLowerCase().includes(`${ctx}/domain/`) || r.toLowerCase().includes(`domain/${ctx}/`)
      );
      if (archivosDominio.length > 0) {
        commits.push({
          id: `commit-${orden}`,
          orden: orden++,
          tipo: 'feat',
          boundedContext: ctx,
          mensaje: `feat(${ctx}-domain): entities, value objects and repository port interfaces`,
          archivos: archivosDominio,
          autor: aCtx.string,
          autorNombre: aCtx.name,
          autorEmail: aCtx.email,
        });
      }

      // 3.2 Aplicación del contexto
      const archivosApp = rutasDisponibles.filter(
        (r) => r.toLowerCase().includes(`${ctx}/application/`) || r.toLowerCase().includes(`application/${ctx}/`)
      );
      if (archivosApp.length > 0) {
        commits.push({
          id: `commit-${orden}`,
          orden: orden++,
          tipo: 'feat',
          boundedContext: ctx,
          mensaje: `feat(${ctx}-application): use cases, command/query handlers and application dtos`,
          archivos: archivosApp,
          autor: aCtx.string,
          autorNombre: aCtx.name,
          autorEmail: aCtx.email,
        });
      }

      // 3.3 Infraestructura del contexto
      const archivosInfra = rutasDisponibles.filter(
        (r) => r.toLowerCase().includes(`${ctx}/infrastructure/`) || r.toLowerCase().includes(`infrastructure/${ctx}/`)
      );
      if (archivosInfra.length > 0) {
        commits.push({
          id: `commit-${orden}`,
          orden: orden++,
          tipo: 'feat',
          boundedContext: ctx,
          mensaje: `feat(${ctx}-infrastructure): persistence adapters, in-memory repos and http controllers`,
          archivos: archivosInfra,
          autor: aCtx.string,
          autorNombre: aCtx.name,
          autorEmail: aCtx.email,
        });
      }

      // 3.4 Pruebas del contexto
      const archivosTest = rutasDisponibles.filter(
        (r) => (r.toLowerCase().includes(`test`) || r.toLowerCase().includes(`spec`)) && r.toLowerCase().includes(ctx)
      );
      if (archivosTest.length > 0) {
        commits.push({
          id: `commit-${orden}`,
          orden: orden++,
          tipo: 'test',
          boundedContext: ctx,
          mensaje: `test(${ctx}): unit test suites and domain invariants verification`,
          archivos: archivosTest,
          autor: aTest.string,
          autorNombre: aTest.name,
          autorEmail: aTest.email,
        });
      }
    }

    // 3.5 Commit E2E & Benchmarks: Pruebas de integración, Stryker y k6 (v3.8)
    const archivosBenchmarks = rutasDisponibles.filter(
      (r) =>
        r.includes('tests/e2e/') ||
        r.includes('stryker.config.json') ||
        r.includes('benchmarks/') ||
        r.includes('scripts/run-benchmarks')
    );
    if (archivosBenchmarks.length > 0) {
      const aBench = resolverAutor(undefined, 'test');
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'test',
        mensaje: 'test(e2e-benchmarks): end-to-end integration suite, stryker mutation config and k6 performance benchmarks',
        archivos: archivosBenchmarks,
        autor: aBench.string,
        autorNombre: aBench.name,
        autorEmail: aBench.email,
      });
    }

    // 4. Archivos restantes no asignados (ej: src/main.ts, pruebas generales, etc.)
    const archivosAsignados = new Set(commits.flatMap((c) => c.archivos));
    const restantes = rutasDisponibles.filter(
      (r) => !archivosAsignados.has(r) && !/^(?:README\.md)$/i.test(r)
    );

    if (restantes.length > 0) {
      const aCore = resolverAutor(undefined, 'feat');
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'feat',
        mensaje: 'feat(core): main bootstrap entrypoint and server composition root',
        archivos: restantes,
        autor: aCore.string,
        autorNombre: aCore.name,
        autorEmail: aCore.email,
      });
    }

    // 5. Commit Final: Documentación README.md Humanizada
    const archivosDocs = rutasDisponibles.filter((r) => /^README\.md$/i.test(r));
    if (archivosDocs.length > 0) {
      const aDocs = resolverAutor(undefined, 'docs');
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'docs',
        mensaje: 'docs: add humanized architectural documentation, bounded contexts guide and readme',
        archivos: archivosDocs,
        autor: aDocs.string,
        autorNombre: aDocs.name,
        autorEmail: aDocs.email,
      });
    }

    // Calcular métricas de contribución por integrante
    const metricasEquipo: MetricaContribucionEquipo[] = [];
    if (team && team.length > 0) {
      for (const m of team) {
        const commitsDelMiembro = commits.filter((c) => c.autorEmail === m.email);
        const contextosDelMiembro = Array.from(
          new Set(
            commitsDelMiembro
              .map((c) => c.boundedContext)
              .filter(Boolean) as string[]
          )
        );
        metricasEquipo.push({
          miembro: m,
          commitsAsignados: commitsDelMiembro.length,
          porcentaje: commits.length > 0 ? Math.round((commitsDelMiembro.length / commits.length) * 100) : 0,
          boundedContexts: contextosDelMiembro,
        });
      }
    }

    // Generar scripts de ejecución táctica (.bat y .sh)
    const scripts = this.generarScripts(branchName, autor, commits);

    return {
      branchName,
      autor,
      commits,
      metricasEquipo,
      scripts,
    };
  }

  /**
   * Genera los scripts de automatización Git para Windows (setup-git.bat) y Linux/Mac (setup-git.sh).
   */
  static generarScripts(
    branchName: string,
    autor: GitAuthorConfig,
    commits: CommitSlice[]
  ): { bat: string; sh: string } {
    const esSquad = autor.teamMembers && autor.teamMembers.length > 1;

    // Script Windows .bat
    let bat = `@echo off\r\n`;
    bat += `echo ================================================================\r\n`;
    bat += `echo   A.R.E.S. v${VERSION} - SOVEREIGN MULTI-CONTRIBUTOR GIT AUTOMATOR\r\n`;
    if (esSquad) {
      bat += `echo   MODO: Squad Colaborativo DDD (${autor.teamMembers!.length} Integrantes)\r\n`;
      for (const m of autor.teamMembers!) {
        bat += `echo     * ${m.name} ^<${m.email}^> [${m.role}]\r\n`;
      }
    } else {
      bat += `echo   Autor: ${autor.name} ^<${autor.email}^>\r\n`;
    }
    bat += `echo   Rama:  ${branchName}\r\n`;
    bat += `echo ================================================================\r\n\r\n`;
    bat += `echo [1/3] Inicializando repositorio Git local...\r\n`;
    bat += `git init\r\n`;
    bat += `git checkout -b ${branchName}\r\n`;
    bat += `git config user.name "${autor.name}"\r\n`;
    bat += `git config user.email "${autor.email}"\r\n\r\n`;
    bat += `echo [2/3] Ejecutando commits atomicos por Bounded Context y Miembro de Equipo...\r\n`;

    for (const c of commits) {
      const filesArg = c.archivos.map((f) => `"${f}"`).join(' ');
      const authorFlag = `"${c.autor}"`;
      bat += `echo  -^> [${c.tipo.toUpperCase()}] ${c.mensaje} (Autor: ${c.autorNombre || autor.name})\r\n`;
      bat += `git add ${filesArg}\r\n`;
      bat += `git commit --author=${authorFlag} -m "${c.mensaje}"\r\n`;
    }

    bat += `\r\necho [3/3] Commits finalizados con exito.\r\n`;
    bat += `if "%1" neq "" (\r\n`;
    bat += `  echo  -^> Conectando con remoto %1 y ejecutando git push...\r\n`;
    bat += `  git remote add origin %1\r\n`;
    bat += `  git push -u origin ${branchName}\r\n`;
    bat += `  echo [OK] Rama ${branchName} publicada en GitHub con contribuciones para todo el equipo.\r\n`;
    bat += `) else (\r\n`;
    bat += `  echo  -^> Repositorio local listo. Para subir a GitHub:\r\n`;
    bat += `  echo      git remote add origin ^<TU_REPO_URL^>\r\n`;
    bat += `  echo      git push -u origin ${branchName}\r\n`;
    bat += `)\r\n`;
    bat += `pause\r\n`;

    // Script Linux/macOS .sh
    let sh = `#!/usr/bin/env bash\n`;
    sh += `set -e\n`;
    sh += `echo "================================================================"\n`;
    sh += `echo "  A.R.E.S. v${VERSION} - SOVEREIGN MULTI-CONTRIBUTOR GIT AUTOMATOR"\n`;
    if (esSquad) {
      sh += `echo "  MODO: Squad Colaborativo DDD (${autor.teamMembers!.length} Integrantes)"\n`;
      for (const m of autor.teamMembers!) {
        sh += `echo "    * ${m.name} <${m.email}> [${m.role}]"\n`;
      }
    } else {
      sh += `echo "  Autor: ${autor.name} <${autor.email}>"\n`;
    }
    sh += `echo "  Rama:  ${branchName}"\n`;
    sh += `echo "================================================================"\n\n`;
    sh += `echo "[1/3] Inicializando repositorio Git local..."\n`;
    sh += `git init\n`;
    sh += `git checkout -b "${branchName}"\n`;
    sh += `git config user.name "${autor.name}"\n`;
    sh += `git config user.email "${autor.email}"\n\n`;
    sh += `echo "[2/3] Ejecutando commits atomicos por Bounded Context y Miembro de Equipo..."\n`;

    for (const c of commits) {
      const filesArg = c.archivos.map((f) => `"${f}"`).join(' ');
      const authorFlag = `"${c.autor}"`;
      sh += `echo " -> [${c.tipo.toUpperCase()}] ${c.mensaje} (Autor: ${c.autorNombre || autor.name})"\n`;
      sh += `git add ${filesArg}\n`;
      sh += `git commit --author=${authorFlag} -m "${c.mensaje}"\n`;
    }

    sh += `\necho "[3/3] Commits finalizados con éxito."\n`;
    sh += `if [ -n "$1" ]; then\n`;
    sh += `  echo " -> Conectando con remoto $1 y ejecutando git push..."\n`;
    sh += `  git remote add origin "$1"\n`;
    sh += `  git push -u origin "${branchName}"\n`;
    sh += `  echo "[OK] Rama ${branchName} publicada en GitHub con contribuciones para todo el equipo."\n`;
    sh += `else\n`;
    sh += `  echo " -> Repositorio local listo. Para subir a GitHub:"\n`;
    sh += `  echo "     git remote add origin <TU_REPO_URL>"\n`;
    sh += `  echo "     git push -u origin ${branchName}"\n`;
    sh += `fi\n`;

    return { bat, sh };
  }

  /**
   * Valida TODA la entrada del cliente ANTES de tocar el disco o ejecutar git.
   * Lanza ValidationError (HTTP 400) ante cualquier dato inseguro.
   */
  static validarEntrada(archivos: unknown, plan: any, tempDir: string): EntradaGitValidada {
    if (!Array.isArray(archivos) || archivos.length === 0 || archivos.length > 500) {
      throw new ValidationError('"files" debe ser un array de 1 a 500 archivos.');
    }

    let totalCaracteres = 0;
    const archivosOk = archivos.map((a: any) => {
      if (!a || typeof a.contenido !== 'string') {
        throw new ValidationError('Cada archivo necesita "ruta" y "contenido" (texto).');
      }
      totalCaracteres += a.contenido.length;
      if (a.contenido.length > 1_000_000 || totalCaracteres > 20_000_000) {
        throw new ValidationError('Los archivos son demasiado grandes (máx. 1 MB c/u y 20 MB en total).');
      }
      const { absoluta, relativa } = resolverRutaSegura(tempDir, a.ruta);
      return { absoluta, relativa, contenido: a.contenido as string };
    });

    if (!plan || typeof plan !== 'object' || !plan.autor || typeof plan.autor !== 'object' || !Array.isArray(plan.commits)) {
      throw new ValidationError('El "plan" debe incluir "autor" y un array "commits".');
    }
    if (plan.commits.length > 100) {
      throw new ValidationError('El plan admite máximo 100 commits.');
    }
    const scripts = plan.scripts;
    if (!scripts || typeof scripts.bat !== 'string' || typeof scripts.sh !== 'string' || scripts.bat.length > 100_000 || scripts.sh.length > 100_000) {
      throw new ValidationError('El plan debe incluir "scripts.bat" y "scripts.sh" como texto (máx. 100.000 caracteres).');
    }

    const commits = plan.commits.map((c: any) => {
      if (!c || !Array.isArray(c.archivos) || c.archivos.length === 0 || c.archivos.length > 500) {
        throw new ValidationError('Cada commit necesita un array "archivos" (1 a 500 rutas).');
      }
      return {
        archivos: c.archivos.map((r: unknown) => resolverRutaSegura(tempDir, r).relativa),
        autor: validarAutorGit(c.autor),
        mensaje: validarMensajeCommit(c.mensaje),
      };
    });

    const remoteUrl = plan.autor.remoteUrl ? validarRemoteUrl(plan.autor.remoteUrl) : undefined;
    const githubToken = remoteUrl && plan.autor.githubToken ? validarTokenGithub(plan.autor.githubToken) : undefined;

    return {
      archivos: archivosOk,
      commits,
      branchName: validarNombreRama(plan.branchName),
      autorNombre: validarNombrePersona(plan.autor.name),
      autorEmail: validarEmail(plan.autor.email),
      remoteUrl,
      githubToken,
      scripts: { bat: scripts.bat, sh: scripts.sh },
    };
  }

  /**
   * Ejecuta físicamente en el backend los commits atómicos con git CLI
   * en un sandbox temporal y opcionalmente realiza el push a GitHub.
   */
  static async ejecutarGitSoberano(
    archivos: ArchivoGenerado[],
    plan: PlanGitCommits
  ): Promise<ResultadoGitPush> {
    const sandboxId = crypto.randomUUID().slice(0, 8);
    const tempDir = path.join(os.tmpdir(), `ares-git-forge-${sandboxId}`);

    // 0. Validar ANTES de crear nada en disco (si algo es inseguro lanza ValidationError → HTTP 400)
    const entrada = this.validarEntrada(archivos, plan, tempDir);

    const logs: string[] = [];
    const commitHashes: string[] = [];
    const token = entrada.githubToken;
    // Nunca devolver ni registrar el token (los mensajes de error de git pueden contener la URL con token)
    const ocultar = (texto: string): string => (token ? texto.split(token).join('***') : texto);
    const git = (args: string[]) =>
      execFileAsync('git', args, { cwd: tempDir, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });

    try {
      logs.push(`[A.R.E.S.] Creando sandbox aislado en: ${tempDir}`);
      await fs.mkdir(tempDir, { recursive: true });

      // 1. Escribir los archivos (rutas ya validadas: no pueden salir de tempDir)
      for (const arch of entrada.archivos) {
        await fs.mkdir(path.dirname(arch.absoluta), { recursive: true });
        await fs.writeFile(arch.absoluta, arch.contenido, 'utf-8');
      }

      // 2. Scripts de automatización
      await fs.writeFile(path.join(tempDir, 'setup-git.bat'), entrada.scripts.bat, 'utf-8');
      await fs.writeFile(path.join(tempDir, 'setup-git.sh'), entrada.scripts.sh, 'utf-8');
      logs.push(`[A.R.E.S.] ${entrada.archivos.length + 2} archivos estructurados en sandbox.`);

      // 3. Inicializar git
      await git(['init']);
      await git(['checkout', '-b', entrada.branchName]);
      await git(['config', 'user.name', entrada.autorNombre]);
      await git(['config', 'user.email', entrada.autorEmail]);
      logs.push(`[Git] Repositorio inicializado en rama '${entrada.branchName}'.`);

      // 4. Commits atómicos ("--" evita que una ruta se interprete como opción)
      for (const slice of entrada.commits) {
        await git(['add', '--', ...slice.archivos]);
        await git(['commit', `--author=${slice.autor}`, '-m', slice.mensaje]);
        const { stdout: hashOut } = await git(['rev-parse', '--short', 'HEAD']);
        const shortHash = hashOut.trim();
        commitHashes.push(shortHash);
        logs.push(`[Commit ${shortHash}] ${slice.mensaje} (Autor: ${slice.autor})`);
      }

      // 5. Push remoto opcional (remoteUrl y token ya validados)
      if (entrada.remoteUrl) {
        const remoteConToken = token ? entrada.remoteUrl.replace('https://', `https://${token}@`) : entrada.remoteUrl;
        logs.push('[Git] Configurando origin remoto...');
        await git(['remote', 'add', 'origin', remoteConToken]);

        logs.push(`[Git] Ejecutando: git push -u origin ${entrada.branchName}...`);
        const { stdout: pushOut, stderr: pushErr } = await git(['push', '-u', 'origin', entrada.branchName]);
        if (pushOut) logs.push(ocultar(pushOut.trim()));
        if (pushErr) logs.push(ocultar(pushErr.trim()));
        logs.push(`🚀 [Push Exitoso] Rama '${entrada.branchName}' publicada en GitHub.`);
      }

      return {
        exitoso: true,
        commitsEjecutados: commitHashes.length,
        rama: entrada.branchName,
        remoteUrl: entrada.remoteUrl,
        commitHashes,
        logs,
      };
    } catch (err: any) {
      const mensaje = ocultar(err?.message || String(err));
      logs.push(`❌ [Error Git]: ${mensaje}`);
      return {
        exitoso: false,
        commitsEjecutados: commitHashes.length,
        rama: entrada.branchName,
        remoteUrl: entrada.remoteUrl,
        commitHashes,
        logs: logs.map(ocultar),
        error: mensaje,
      };
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignorar fallas menores de limpieza
      }
    }
  }
}

interface EntradaGitValidada {
  archivos: { absoluta: string; relativa: string; contenido: string }[];
  commits: { archivos: string[]; autor: string; mensaje: string }[];
  branchName: string;
  autorNombre: string;
  autorEmail: string;
  remoteUrl?: string;
  githubToken?: string;
  scripts: { bat: string; sh: string };
}
