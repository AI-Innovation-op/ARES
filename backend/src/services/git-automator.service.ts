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

const execFileAsync = promisify(execFile);

export interface GitAuthorConfig {
  name: string;
  email: string;
  branchName?: string;
  remoteUrl?: string;
  githubToken?: string;
}

export interface CommitSlice {
  id: string;
  orden: number;
  mensaje: string;
  tipo: 'chore' | 'feat' | 'test' | 'docs';
  boundedContext?: string;
  archivos: string[];
  autor: string;
}

export interface ArchivoGenerado {
  ruta: string;
  contenido: string;
}

export interface PlanGitCommits {
  branchName: string;
  autor: GitAuthorConfig;
  commits: CommitSlice[];
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
    const authorString = `${autor.name} <${autor.email}>`;
    const commits: CommitSlice[] = [];
    let orden = 1;

    // Rutas de archivos normalizadas
    const rutasDisponibles = archivos.map((a) => a.ruta.replace(/\\/g, '/'));

    // 1. Commit Inicial: Scaffold & Configuración
    const archivosScaffold = rutasDisponibles.filter((r) =>
      /^(?:package\.json|tsconfig\.json|\.gitignore|\.env\.example|SPECIFICATION\.md|setup-git\.(?:bat|sh))$/i.test(
        r
      )
    );
    if (archivosScaffold.length > 0) {
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'chore',
        mensaje: 'chore(scaffold): initial project setup, environment configuration and tactical specs',
        archivos: archivosScaffold,
        autor: authorString,
      });
    }

    // 2. Commit Shared Kernel: Objetos base y eventos transversales
    const archivosShared = rutasDisponibles.filter((r) => r.includes('src/shared/') || r.includes('shared/'));
    if (archivosShared.length > 0) {
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'feat',
        boundedContext: 'shared',
        mensaje: 'feat(shared-kernel): domain events, base value objects and aggregate root contracts',
        archivos: archivosShared,
        autor: authorString,
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
          autor: authorString,
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
          autor: authorString,
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
          autor: authorString,
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
          autor: authorString,
        });
      }
    }

    // 4. Archivos restantes no asignados (ej: src/main.ts, pruebas generales, etc.)
    const archivosAsignados = new Set(commits.flatMap((c) => c.archivos));
    const restantes = rutasDisponibles.filter(
      (r) => !archivosAsignados.has(r) && !/^(?:README\.md)$/i.test(r)
    );

    if (restantes.length > 0) {
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'feat',
        mensaje: 'feat(core): main bootstrap entrypoint and server composition root',
        archivos: restantes,
        autor: authorString,
      });
    }

    // 5. Commit Final: Documentación README.md Humanizada
    const archivosDocs = rutasDisponibles.filter((r) => /^README\.md$/i.test(r));
    if (archivosDocs.length > 0) {
      commits.push({
        id: `commit-${orden}`,
        orden: orden++,
        tipo: 'docs',
        mensaje: 'docs: add humanized architectural documentation, bounded contexts guide and readme',
        archivos: archivosDocs,
        autor: authorString,
      });
    }

    // Generar scripts de ejecución táctica (.bat y .sh)
    const scripts = this.generarScripts(branchName, autor, commits);

    return {
      branchName,
      autor,
      commits,
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
    const authorParam = `"${autor.name} <${autor.email}>"`;

    // Script Windows .bat
    let bat = `@echo off\r\n`;
    bat += `echo ================================================================\r\n`;
    bat += `echo   A.R.E.S. v3.5 - SOVEREIGN GIT REPO AUTOMATOR\r\n`;
    bat += `echo   Autor: ${autor.name} ^<${autor.email}^>\r\n`;
    bat += `echo   Rama:  ${branchName}\r\n`;
    bat += `echo ================================================================\r\n\r\n`;
    bat += `echo [1/3] Inicializando repositorio Git local...\r\n`;
    bat += `git init\r\n`;
    bat += `git checkout -b ${branchName}\r\n`;
    bat += `git config user.name "${autor.name}"\r\n`;
    bat += `git config user.email "${autor.email}"\r\n\r\n`;
    bat += `echo [2/3] Ejecutando commits atomicos por Bounded Context...\r\n`;

    for (const c of commits) {
      const filesArg = c.archivos.map((f) => `"${f}"`).join(' ');
      bat += `echo  -^> [${c.tipo.toUpperCase()}] ${c.mensaje}\r\n`;
      bat += `git add ${filesArg}\r\n`;
      bat += `git commit --author=${authorParam} -m "${c.mensaje}"\r\n`;
    }

    bat += `\r\necho [3/3] Commits finalizados con exito.\r\n`;
    bat += `if "%1" neq "" (\r\n`;
    bat += `  echo  -^> Conectando con remoto %1 y ejecutando git push...\r\n`;
    bat += `  git remote add origin %1\r\n`;
    bat += `  git push -u origin ${branchName}\r\n`;
    bat += `  echo [OK] Rama ${branchName} publicada en GitHub con contribuciones para ${autor.name}.\r\n`;
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
    sh += `echo "  A.R.E.S. v3.5 - SOVEREIGN GIT REPO AUTOMATOR"\n`;
    sh += `echo "  Autor: ${autor.name} <${autor.email}>"\n`;
    sh += `echo "  Rama:  ${branchName}"\n`;
    sh += `echo "================================================================"\n\n`;
    sh += `echo "[1/3] Inicializando repositorio Git local..."\n`;
    sh += `git init\n`;
    sh += `git checkout -b "${branchName}"\n`;
    sh += `git config user.name "${autor.name}"\n`;
    sh += `git config user.email "${autor.email}"\n\n`;
    sh += `echo "[2/3] Ejecutando commits atomicos por Bounded Context..."\n`;

    for (const c of commits) {
      const filesArg = c.archivos.map((f) => `"${f}"`).join(' ');
      sh += `echo " -> [${c.tipo.toUpperCase()}] ${c.mensaje}"\n`;
      sh += `git add ${filesArg}\n`;
      sh += `git commit --author=${authorParam} -m "${c.mensaje}"\n`;
    }

    sh += `\necho "[3/3] Commits finalizados con éxito."\n`;
    sh += `if [ -n "$1" ]; then\n`;
    sh += `  echo " -> Conectando con remoto $1 y ejecutando git push..."\n`;
    sh += `  git remote add origin "$1"\n`;
    sh += `  git push -u origin "${branchName}"\n`;
    sh += `  echo "[OK] Rama ${branchName} publicada en GitHub con contribuciones para ${autor.name}."\n`;
    sh += `else\n`;
    sh += `  echo " -> Repositorio local listo. Para subir a GitHub:"\n`;
    sh += `  echo "     git remote add origin <TU_REPO_URL>"\n`;
    sh += `  echo "     git push -u origin ${branchName}"\n`;
    sh += `fi\n`;

    return { bat, sh };
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
    const logs: string[] = [];
    const commitHashes: string[] = [];

    try {
      logs.push(`[A.R.E.S.] Creando sandbox aislado en: ${tempDir}`);
      await fs.mkdir(tempDir, { recursive: true });

      // 1. Escribir todos los archivos generados en disco
      for (const arch of archivos) {
        const fullPath = path.join(tempDir, arch.ruta);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, arch.contenido, 'utf-8');
      }

      // 2. Escribir los scripts de automatización también en el sandbox
      await fs.writeFile(path.join(tempDir, 'setup-git.bat'), plan.scripts.bat, 'utf-8');
      await fs.writeFile(path.join(tempDir, 'setup-git.sh'), plan.scripts.sh, 'utf-8');
      logs.push(`[A.R.E.S.] ${archivos.length + 2} archivos estructurados en sandbox.`);

      // 3. Inicializar git
      await execFileAsync('git', ['init'], { cwd: tempDir });
      await execFileAsync('git', ['checkout', '-b', plan.branchName], { cwd: tempDir });
      await execFileAsync('git', ['config', 'user.name', plan.autor.name], { cwd: tempDir });
      await execFileAsync('git', ['config', 'user.email', plan.autor.email], { cwd: tempDir });
      logs.push(`[Git] Repositorio inicializado en rama '${plan.branchName}'.`);

      // 4. Ejecutar cada commit atómico
      const authorFlag = `${plan.autor.name} <${plan.autor.email}>`;

      for (const slice of plan.commits) {
        // Stage files
        await execFileAsync('git', ['add', ...slice.archivos], { cwd: tempDir });

        // Commit con autor asignado
        await execFileAsync('git', ['commit', `--author=${authorFlag}`, '-m', slice.mensaje], { cwd: tempDir });

        // Obtener hash generado
        const { stdout: hashOut } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: tempDir });
        const shortHash = hashOut.trim();
        commitHashes.push(shortHash);

        logs.push(`[Commit ${shortHash}] ${slice.mensaje} (Autor: ${authorFlag})`);
      }

      // 5. Si se proporcionó un remoteUrl, intentar push remoto
      if (plan.autor.remoteUrl) {
        let remoteUrlFinal = plan.autor.remoteUrl.trim();

        // Si se incluye GitHub Personal Access Token, inyectarlo en la URL segura
        if (plan.autor.githubToken) {
          const tokenLimpio = plan.autor.githubToken.trim();
          if (remoteUrlFinal.startsWith('https://')) {
            remoteUrlFinal = remoteUrlFinal.replace('https://', `https://${tokenLimpio}@`);
          }
        }

        logs.push(`[Git] Configurando origin remoto...`);
        await execFileAsync('git', ['remote', 'add', 'origin', remoteUrlFinal], { cwd: tempDir });

        logs.push(`[Git] Ejecutando: git push -u origin ${plan.branchName}...`);
        const { stdout: pushOut, stderr: pushErr } = await execFileAsync(
          'git',
          ['push', '-u', 'origin', plan.branchName],
          { cwd: tempDir }
        );

        if (pushOut) logs.push(pushOut.trim());
        if (pushErr) logs.push(pushErr.trim());
        logs.push(`🚀 [Push Exitoso] Rama '${plan.branchName}' publicada en GitHub.`);
      }

      return {
        exitoso: true,
        commitsEjecutados: commitHashes.length,
        rama: plan.branchName,
        remoteUrl: plan.autor.remoteUrl,
        commitHashes,
        logs,
      };
    } catch (err: any) {
      logs.push(`❌ [Error Git]: ${err?.message || String(err)}`);
      return {
        exitoso: false,
        commitsEjecutados: commitHashes.length,
        rama: plan.branchName,
        remoteUrl: plan.autor.remoteUrl,
        commitHashes,
        logs,
        error: err?.message || String(err),
      };
    } finally {
      // Limpiar sandbox temporal para no saturar disco
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignorar fallas menores de limpieza en Windows
      }
    }
  }
}
