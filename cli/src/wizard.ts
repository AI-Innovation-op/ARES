/**
 * @fileoverview Asistente Táctico Interactivo de Forja DDD (v4.0 Release).
 * Guía paso a paso al desarrollador para convertir enunciados en proyectos completos,
 * empaquetar descargas directas en formato .ZIP (en disco C: o D:) y automatizar Git.
 * @module cli/wizard
 */

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import JSZip from 'jszip';
import { imprimirLineaDivisoria } from './banner.js';

export interface OpcionesWizard {
  rl?: readline.Interface;
  apiBase?: string;
  enunciadoInicial?: string;
}

export async function ejecutarAsistenteForja(opciones: OpcionesWizard = {}): Promise<void> {
  const apiBase = opciones.apiBase || process.env.ARES_API_URL || 'http://localhost:3000';
  let rl = opciones.rl;
  let cerrarRlAlFinalizar = false;

  if (!rl) {
    rl = readline.createInterface({ input, output, terminal: true });
    cerrarRlAlFinalizar = true;
  }

  try {
    imprimirLineaDivisoria('ASISTENTE DE FORJA DDD & PROYECTOS SOBERANOS (v4.0)');
    console.log(pc.cyan('  Este asistente transformará tu enunciado en una arquitectura DDD limpia,\n  con README humanizado, descarga en .ZIP y commits atómicos firmados.\n'));

    // ========================================================================
    // PASO 1: Obtención del Enunciado
    // ========================================================================
    console.log(pc.bold(pc.white('PASO 1: ENUNCIADO O EJERCICIO A RESOLVER')));
    let textoEnunciado = opciones.enunciadoInicial?.trim() || '';

    if (!textoEnunciado) {
      // Intentar leer el portapapeles de Windows de forma automática
      let textoClipboard = '';
      try {
        textoClipboard = execSync('powershell.exe -NoProfile -Command "Get-Clipboard"', {
          encoding: 'utf-8',
          timeout: 2500,
        }).trim();
      } catch {
        textoClipboard = '';
      }

      if (textoClipboard && textoClipboard.length > 25) {
        const preview = textoClipboard.slice(0, 100).replace(/\r?\n/g, ' ');
        console.log(pc.green(`  📋 Detecté texto en tu portapapeles (${textoClipboard.length} caracteres):`));
        console.log(pc.dim(`     "${preview}..."\n`));
        const usarClip = await rl.question(pc.bold(pc.cyan('  ¿Deseas usar el texto de tu portapapeles? (S/n): ')));
        if (!usarClip || usarClip.trim().toLowerCase().startsWith('s')) {
          textoEnunciado = textoClipboard;
        }
      }

      if (!textoEnunciado) {
        console.log(pc.white('  Selecciona una opción de entrada:'));
        console.log(`    ${pc.cyan('1.')} Pegar texto en la consola`);
        console.log(`    ${pc.cyan('2.')} Cargar desde un archivo existente (.txt, .md o .pdf)`);
        console.log(`    ${pc.cyan('3.')} Usar el caso canónico de Sistema de Préstamos DDD (Demo)`);
        const opcionEntrada = (await rl.question(pc.bold(pc.cyan('  Elige opción [1-3] (Por defecto: 3): ')))).trim();

        if (opcionEntrada === '1') {
          console.log(pc.yellow('  Pega el texto del enunciado a continuación. Presiona Enter cuando termines:'));
          textoEnunciado = await rl.question(pc.white('  > '));
        } else if (opcionEntrada === '2') {
          const ruta = (await rl.question(pc.bold(pc.cyan('  Ruta del archivo (ej: D:\\examen.txt): ')))).trim();
          const rutaAbs = path.resolve(ruta);
          if (fs.existsSync(rutaAbs)) {
            textoEnunciado = fs.readFileSync(rutaAbs, 'utf-8');
            console.log(pc.green(`  ✓ Archivo cargado exitosamente (${textoEnunciado.length} caracteres)`));
          } else {
            console.log(pc.red(`  ❌ El archivo no existe. Usando caso canónico de demostración.`));
          }
        }

        if (!textoEnunciado) {
          textoEnunciado = `ENUNCIADO: SISTEMA DE GESTIÓN DE PRÉSTAMOS BIBLIOTECARIOS (DDD)
Requerimiento de préstamos con control de penalizaciones y catálogo por ISBN.
Bounded Contexts requeridos:
- Prestamos: Control de préstamos y vencimientos
- Catalogo: Registro de libros y disponibilidad
- Usuarios: Estudiantes y sanciones`;
          console.log(pc.dim('  Usando caso canónico de Sistema de Préstamos DDD.'));
        }
      }
    }

    // ========================================================================
    // PASO 2: Desofuscación y Extracción de Bounded Contexts
    // ========================================================================
    console.log(pc.cyan('\n  ✨ Analizando enunciado y estructurando Bounded Contexts...'));
    const resClean = await fetch(`${apiBase}/api/assignment/clean-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textoEnunciado }),
    });

    if (!resClean.ok) {
      throw new Error(`Error del servidor al limpiar texto: ${await resClean.text()}`);
    }

    const dataClean = await resClean.json();
    const analisis = dataClean.analysis;

    console.log(`\n${pc.bold(pc.white('PASO 2: DEFINICIÓN DE ARQUITECTURA'))}`);
    console.log(`  ${pc.white('Título sugerido:')}    ${pc.bold(pc.green(analisis.titulo))}`);
    console.log(`  ${pc.white('Bounded Contexts:')}  ${analisis.boundedContexts.map((c: any) => pc.cyan(c.nombre)).join(', ')}`);
    console.log(`  ${pc.white('Entidades Clave:')}   ${analisis.entidadesClave.slice(0, 6).join(', ')}`);

    const tituloPersonalizado = await rl.question(pc.bold(pc.cyan(`  ¿Deseas cambiar el título? (Presiona Enter para mantener): `)));
    if (tituloPersonalizado.trim()) {
      analisis.titulo = tituloPersonalizado.trim();
      analisis.slug = tituloPersonalizado.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
    }

    // ========================================================================
    // PASO 3: Selección de Stack Tecnológico
    // ========================================================================
    console.log(`\n${pc.bold(pc.white('PASO 3: STACK TECNOLÓGICO'))}`);
    console.log(`    ${pc.cyan('1.')} TypeScript DDD + Hexagonal (Node.js 24 + Express 5) ${pc.green('[Recomendado]')}`);
    console.log(`    ${pc.cyan('2.')} Vue 3 + TypeScript (Frontend Domain-Driven)`);
    console.log(`    ${pc.cyan('3.')} Fullstack (TypeScript Backend + Vue 3 Frontend)`);
    console.log(`    ${pc.cyan('4.')} Python FastAPI (Clean Architecture)`);
    const opcionStack = (await rl.question(pc.bold(pc.cyan('  Elige stack [1-4] (Por defecto: 1): ')))).trim();

    let stackDeseado = 'typescript-ddd';
    if (opcionStack === '2') stackDeseado = 'vue-ddd';
    else if (opcionStack === '3') stackDeseado = 'fullstack-ddd';
    else if (opcionStack === '4') stackDeseado = 'python-ddd';

    // ========================================================================
    // PASO 4: Atribución de Autor y Matriz de Equipo (Squad)
    // ========================================================================
    console.log(`\n${pc.bold(pc.white('PASO 4: ATRIBUCIÓN DE AUTOR Y CUADROS VERDES GIT'))}`);
    const nombreAutor = (await rl.question(pc.bold(pc.cyan('  Tu Nombre Completo para los commits (Por defecto: Kevin Commander): ')))).trim() || 'Kevin Commander';
    const emailAutor = (await rl.question(pc.bold(pc.cyan('  Tu Correo de GitHub (Por defecto: kevin.commander@gmail.com): ')))).trim() || 'kevin.commander@gmail.com';
    const ramaGit = (await rl.question(pc.bold(pc.cyan(`  Nombre de la rama Git (Por defecto: feature/${analisis.slug}): `)))).trim() || `feature/${analisis.slug}`;

    const esEquipo = (await rl.question(pc.bold(pc.cyan('  ¿Es un trabajo grupal / equipo multi-integrante? (s/N): ')))).trim().toLowerCase().startsWith('s');
    const teamMembers: Array<{ name: string; email: string; boundedContext: string }> = [];

    if (esEquipo) {
      console.log(pc.yellow('\n  👥 Asignación de Bounded Contexts a tu equipo:'));
      for (const bc of analisis.boundedContexts) {
        console.log(pc.cyan(`\n  • Contexto: ${pc.bold(bc.nombre)}`));
        const respMember = (await rl.question(pc.white(`    Asignar a compañero (Formato: Nombre <correo>) [Enter para ti]: `))).trim();
        if (respMember && respMember.includes('<') && respMember.includes('>')) {
          const match = respMember.match(/^(.*?)\s*<([^>]+)>/);
          if (match) {
            teamMembers.push({
              name: match[1].trim(),
              email: match[2].trim(),
              boundedContext: bc.identificador,
            });
            console.log(pc.green(`    ✓ Asignado a ${match[1].trim()}`));
            continue;
          }
        }
        teamMembers.push({
          name: nombreAutor,
          email: emailAutor,
          boundedContext: bc.identificador,
        });
        console.log(pc.dim(`    ✓ Asignado a ${nombreAutor}`));
      }
    }

    // ========================================================================
    // PASO 5: Destino y Descarga Directa en .ZIP (Disco C: o D:)
    // ========================================================================
    console.log(`\n${pc.bold(pc.white('PASO 5: DESTINO DE DESCARGA & FORMATO .ZIP'))}`);
    console.log(pc.dim('  Puedes indicar cualquier ruta de tu disco (ej: D:\\mis-proyectos, C:\\Users\\Kevin\\Desktop, etc.)'));
    const rutaDestinoInput = (await rl.question(pc.bold(pc.cyan(`  Carpeta de destino (Por defecto: ./forja-${analisis.slug}): `)))).trim();
    const carpetaDestino = path.resolve(rutaDestinoInput || `./forja-${analisis.slug}`);

    const crearZip = (await rl.question(pc.bold(pc.cyan('  ¿Deseas generar también un archivo .ZIP directo descargable? (S/n): ')))).trim().toLowerCase();
    const debeCrearZip = !crearZip || crearZip.startsWith('s');

    // ========================================================================
    // PASO 6: Ejecución de la Forja
    // ========================================================================
    console.log(pc.cyan('\n  ⚔️  Forjando proyecto DDD, entidades, arquitectura y commits...'));

    const resForge = await fetch(`${apiBase}/api/assignment/forge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysis: analisis,
        author: {
          name: nombreAutor,
          email: emailAutor,
          branchName: ramaGit,
          teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
        },
        stack: stackDeseado,
      }),
    });

    if (!resForge.ok) {
      throw new Error(`Error en la forja de archivos: ${await resForge.text()}`);
    }

    const dataForge = await resForge.json();
    const proyecto = dataForge.project;

    // 1. Escribir archivos en la carpeta destino
    fs.mkdirSync(carpetaDestino, { recursive: true });
    for (const a of proyecto.archivos) {
      const dest = path.join(carpetaDestino, a.ruta);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, a.contenido, 'utf-8');
    }

    console.log(pc.green(`  ✓ ${proyecto.archivos.length} archivos escritos en:`));
    console.log(pc.bold(pc.white(`    ${carpetaDestino}`)));

    // 2. Empaquetar en .ZIP si se solicitó
    let rutaZipGenerado = '';
    if (debeCrearZip) {
      const zip = new JSZip();
      for (const a of proyecto.archivos) {
        zip.file(a.ruta, a.contenido);
      }

      const bufferZip = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      const nombreZip = `${analisis.slug}.zip`;
      rutaZipGenerado = path.join(path.dirname(carpetaDestino), nombreZip);
      fs.writeFileSync(rutaZipGenerado, bufferZip);

      console.log(pc.green(`  ✓ Archivo .ZIP empaquetado exitosamente en:`));
      console.log(pc.bold(pc.cyan(`    ${rutaZipGenerado}`)) + pc.dim(` (${(bufferZip.length / 1024).toFixed(1)} KB)`));
    }

    // ========================================================================
    // PASO 7: Automatización Git y Commits Atómicos
    // ========================================================================
    console.log(`\n${pc.bold(pc.white('PASO 7: INICIALIZACIÓN GIT & COMMITS ATÓMICOS'))}`);
    const initGit = (await rl.question(pc.bold(pc.cyan('  ¿Deseas inicializar Git y disparar los commits atómicos firmados ahora? (S/n): ')))).trim().toLowerCase();
    const debeInitGit = !initGit || initGit.startsWith('s');

    if (debeInitGit) {
      try {
        console.log(pc.cyan('  🔧 Inicializando repositorio Git y firmando commits secuenciales...'));
        execSync(`git init`, { cwd: carpetaDestino, stdio: 'ignore' });
        execSync(`git checkout -b "${ramaGit}"`, { cwd: carpetaDestino, stdio: 'ignore' });

        const plan = proyecto.planGit;
        if (plan && plan.commits && plan.commits.length > 0) {
          for (const c of plan.commits) {
            // Añadir los archivos de este commit específico
            for (const f of c.archivos) {
              const fullF = path.join(carpetaDestino, f);
              if (fs.existsSync(fullF)) {
                execSync(`git add "${f}"`, { cwd: carpetaDestino, stdio: 'ignore' });
              }
            }
            const authorStr = `${c.autor.nombre} <${c.autor.email}>`;
            const msgEscaped = c.mensaje.replace(/"/g, '\\"');
            try {
              execSync(`git commit --author="${authorStr}" -m "${msgEscaped}"`, {
                cwd: carpetaDestino,
                stdio: 'ignore',
              });
            } catch {
              // Si no había cambios en este paso, continuar
            }
          }
          console.log(pc.green(`  ✅ ${plan.commits.length} commits atómicos creados y firmados con éxito.`));
          console.log(pc.bold(pc.green('     ¡Tus cuadros verdes en GitHub están listos para brillar!')));
        }
      } catch (gitErr: any) {
        console.log(pc.yellow(`  ⚠️ Aviso Git: ${gitErr.message || 'No se pudieron crear commits automáticamente'}.`));
        console.log(pc.cyan(`     Puedes ejecutar "setup-git.bat" directamente en la carpeta del proyecto.`));
      }

      // Preguntar por Push a GitHub
      const urlRemoto = (await rl.question(pc.bold(pc.cyan('  ¿Deseas vincular una URL remota de GitHub para hacer push ahora? (Enter para omitir): ')))).trim();
      if (urlRemoto) {
        try {
          execSync(`git remote add origin "${urlRemoto}"`, { cwd: carpetaDestino, stdio: 'ignore' });
          console.log(pc.cyan(`  🚀 Empujando rama "${ramaGit}" hacia GitHub...`));
          execSync(`git push -u origin "${ramaGit}"`, { cwd: carpetaDestino, stdio: 'inherit' });
          console.log(pc.green('  ✅ ¡Proyecto subido a GitHub exitosamente!'));
        } catch (pushErr: any) {
          console.log(pc.yellow(`  ⚠️ No se pudo completar el push automático: ${pushErr.message}`));
          console.log(pc.dim('     Puedes hacer push manual con: git push -u origin ' + ramaGit));
        }
      }
    }

    imprimirLineaDivisoria('RESUMEN DE ENTREGA TÁCTICA');
    console.log(`  ${pc.white('Proyecto:')}         ${pc.bold(analisis.titulo)}`);
    console.log(`  ${pc.white('Carpeta Código:')}    ${pc.green(carpetaDestino)}`);
    if (rutaZipGenerado) {
      console.log(`  ${pc.white('Archivo .ZIP:')}      ${pc.bold(pc.cyan(rutaZipGenerado))}`);
    }
    console.log(`  ${pc.white('Autor Principal:')}   ${nombreAutor} (${emailAutor})`);
    console.log(`  ${pc.white('Rama Git:')}          ${ramaGit}\n`);
  } catch (err: any) {
    console.error(pc.red(`\n❌ Error en el asistente de forja: ${err.message || String(err)}\n`));
  } finally {
    if (cerrarRlAlFinalizar && rl) {
      rl.close();
    }
  }
}
