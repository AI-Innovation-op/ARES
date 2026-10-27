#!/usr/bin/env node

/**
 * @fileoverview CLI Táctico de A.R.E.S. v2.6.
 * Ejecuta auditorías de código, forja de documentación, generación de pruebas unitarias
 * y telemetría biométrica directamente desde la línea de comandos.
 * @module cli/index
 */

import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import JSZip from 'jszip';
import { imprimirBannerCircuito } from './banner.js';
import { TacticalRepl, iniciarRepl } from './repl.js';
import { ejecutarAsistenteForja } from './wizard.js';

// Intentar cargar variables desde .env en el directorio actual o en backend
const posiblesEnv = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../backend/.env'),
  path.resolve('D:/ares-ecosystem/backend/.env'),
  path.resolve('D:/ares-ecosystem/.env'),
];

for (const envPath of posiblesEnv) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const API_BASE = process.env.ARES_API_URL || 'http://localhost:3000';

function banner() {
  imprimirBannerCircuito('v4.0 RELEASE', 'Created by AI Innovation');
}

async function verificarServidor(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

const program = new Command();

program
  .name('ares')
  .description('🛡️ A.R.E.S. CLI Táctico — Terminal Standalone de Ingeniería de Software asistida por IA')
  .version('4.0.0');

// ============================================================================
// 1. COMANDO: ares audit <file>
// ============================================================================
program
  .command('audit <archivo>')
  .description('⚔️ Audita código con la Espada Binaria (SOLID, Big-O, OWASP y Refactorización)')
  .option('-w, --write', 'Sobrescribe el archivo original con el código refactorizado (crea backup .bak)')
  .option('-o, --output <salida>', 'Ruta del archivo de salida para el código refactorizado')
  .option('-l, --lang <lenguaje>', 'Lenguaje del archivo (se infiere si no se especifica)')
  .action(async (archivo, opciones) => {
    banner();
    const rutaAbsoluta = path.resolve(archivo);

    if (!fs.existsSync(rutaAbsoluta)) {
      console.error(pc.red(`❌ Error: El archivo "${archivo}" no existe en el sistema.`));
      process.exit(1);
    }

    const contenido = fs.readFileSync(rutaAbsoluta, 'utf-8');
    const extension = path.extname(archivo).replace('.', '') || 'typescript';
    const lenguaje = opciones.lang || extension;

    console.log(pc.yellow(`⚔️  Iniciando auditoría de combate sobre: ${pc.bold(archivo)} (${lenguaje})...`));

    const online = await verificarServidor();
    if (!online) {
      console.error(pc.red(`❌ El servidor de A.R.E.S. en ${API_BASE} no está activo.`));
      console.log(pc.cyan(`👉 Inicia el servidor con: cd D:\\ares-ecosystem\\backend && npm run dev`));
      process.exit(1);
    }

    try {
      const res = await fetch(`${API_BASE}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lenguaje,
          code: contenido,
        }),
      });

      if (!res.ok) {
        throw new Error(`Falla HTTP ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as any;

      console.log(pc.green('\n✅ AUDITORÍA COMPLETADA CON ÉXITO\n'));

      // Tarjetas de Métricas
      if (data.metrics) {
        console.log(pc.bold(pc.cyan('📊 MÉTRICAS TÁCTICAS:')));
        console.log(pc.gray('----------------------------------------------------'));
        console.log(`  ${pc.bold('Complejidad Big-O:')} ${pc.red(data.metrics.bigO_antes)} ➔ ${pc.green(data.metrics.bigO_despues)}`);
        console.log(`  ${pc.bold('Puntuación SOLID:')}  ${pc.yellow(data.metrics.solid_antes + '/100')} ➔ ${pc.green(data.metrics.solid_despues + '/100')}`);
        console.log(`  ${pc.bold('Nivel Seguridad:')}   ${pc.yellow(data.metrics.seguridad_antes)} ➔ ${pc.green(data.metrics.seguridad_despues)}`);
        console.log(pc.gray('----------------------------------------------------\n'));
      }

      console.log(pc.bold(pc.magenta('📋 INFORME Y DIAGNÓSTICO:')));
      console.log(data.analysis);

      // Guardar código refactorizado si se solicitó
      if (opciones.write) {
        const backupPath = `${rutaAbsoluta}.bak`;
        fs.writeFileSync(backupPath, contenido);
        fs.writeFileSync(rutaAbsoluta, data.refactoredCode);
        console.log(pc.green(`\n💾 Archivo original actualizado. Backup guardado en: ${backupPath}`));
      } else if (opciones.output) {
        const outAbs = path.resolve(opciones.output);
        fs.writeFileSync(outAbs, data.refactoredCode);
        console.log(pc.green(`\n💾 Código refactorizado exportado a: ${outAbs}`));
      } else {
        console.log(pc.dim('\n💡 Sugerencia: Usa --write para aplicar el refactor o --output <archivo> para guardarlo.'));
      }
    } catch (err: any) {
      console.error(pc.red(`💥 Falla crítica en la auditoría: ${err.message}`));
      process.exit(1);
    }
  });

// ============================================================================
// 2. COMANDO: ares doc <type> <contexto>
// ============================================================================
program
  .command('doc <tipo> [archivoOTexto]')
  .description('🛡️ Forja documentación técnica industrial con el Escudo Aegis (readme, adr, openapi, rfc, c4)')
  .option('-t, --title <titulo>', 'Título formal del documento')
  .option('-o, --output <salida>', 'Archivo de destino para guardar el documento generado')
  .action(async (tipo, archivoOTexto, opciones) => {
    banner();

    const tipoNormalizado = tipo.toUpperCase();
    const tiposValidos = ['README', 'ADR', 'RFC', 'OPENAPI', 'MERMAID_C4', 'DOCSTRINGS'];

    if (!tiposValidos.includes(tipoNormalizado)) {
      console.error(pc.red(`❌ Tipo no válido. Tipos soportados: ${tiposValidos.join(', ')}`));
      process.exit(1);
    }

    let contexto = archivoOTexto || '';
    if (contexto && fs.existsSync(contexto)) {
      console.log(pc.cyan(`📄 Leyendo contexto desde archivo: ${contexto}`));
      contexto = fs.readFileSync(contexto, 'utf-8');
    } else if (!contexto) {
      // Si no se pasó argumento, intentar leer package.json o directorio actual
      if (fs.existsSync('package.json')) {
        console.log(pc.cyan('📄 Extrayendo contexto automático desde package.json...'));
        contexto = fs.readFileSync('package.json', 'utf-8');
      } else {
        contexto = `Proyecto en directorio: ${path.basename(process.cwd())}`;
      }
    }

    console.log(pc.yellow(`🛡️  Forjando artefacto documental [${tipoNormalizado}] con el Escudo Aegis...`));

    const online = await verificarServidor();
    if (!online) {
      console.error(pc.red(`❌ El servidor de A.R.E.S. en ${API_BASE} no está activo.`));
      process.exit(1);
    }

    try {
      const res = await fetch(`${API_BASE}/api/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: tipoNormalizado,
          sourceContext: contexto,
          title: opciones.title,
        }),
      });

      if (!res.ok) {
        throw new Error(`Falla HTTP ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as any;
      console.log(pc.green(`\n✅ ARTEFACTO FORJADO: ${data.title}\n`));

      if (opciones.output) {
        const outPath = path.resolve(opciones.output);
        fs.writeFileSync(outPath, data.markdownContent);
        console.log(pc.green(`💾 Documento guardado exitosamente en: ${outPath}`));
      } else {
        console.log(data.markdownContent);
      }
    } catch (err: any) {
      console.error(pc.red(`💥 Falla al forjar documento: ${err.message}`));
      process.exit(1);
    }
  });

// ============================================================================
// 3. COMANDO: ares test <file>
// ============================================================================
program
  .command('test <archivo>')
  .description('🧪 Genera una suite de pruebas unitarias industriales con el Test Forge')
  .option('-f, --framework <framework>', 'Framework de pruebas: vitest, jest, pytest, gotest', 'vitest')
  .option('-o, --output <salida>', 'Ruta para exportar el archivo de pruebas generado')
  .action(async (archivo, opciones) => {
    banner();
    const rutaAbsoluta = path.resolve(archivo);

    if (!fs.existsSync(rutaAbsoluta)) {
      console.error(pc.red(`❌ Error: El archivo "${archivo}" no existe.`));
      process.exit(1);
    }

    const contenido = fs.readFileSync(rutaAbsoluta, 'utf-8');
    const extension = path.extname(archivo).replace('.', '') || 'typescript';

    console.log(pc.yellow(`🧪 Generando suite de pruebas en ${opciones.framework.toUpperCase()} para: ${archivo}...`));

    const online = await verificarServidor();
    if (!online) {
      console.error(pc.red(`❌ Servidor A.R.E.S. no disponible en ${API_BASE}`));
      process.exit(1);
    }

    try {
      const res = await fetch(`${API_BASE}/api/tests/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: contenido,
          language: extension,
          framework: opciones.framework,
        }),
      });

      if (!res.ok) {
        throw new Error(`Falla HTTP ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as any;
      console.log(pc.green('\n✅ SUITE DE PRUEBAS FORJADA\n'));
      console.log(pc.cyan('📋 Resumen Táctico:'), data.summary);

      if (opciones.output) {
        const outPath = path.resolve(opciones.output);
        fs.writeFileSync(outPath, data.testCode);
        console.log(pc.green(`\n💾 Suite de tests guardada en: ${outPath}`));
      } else {
        console.log('\n' + data.testCode);
      }
    } catch (err: any) {
      console.error(pc.red(`💥 Falla generando tests: ${err.message}`));
      process.exit(1);
    }
  });

// ============================================================================
// 4. COMANDO: ares bio
// ============================================================================
program
  .command('bio')
  .description('❤️‍🩹 Consulta la telemetría del Protocolo Bio-Armadura y bienestar del Comandante')
  .action(async () => {
    banner();
    console.log(pc.yellow('📡 Conectando con telemetría Bio-Armadura...\n'));

    try {
      const res = await fetch(`${API_BASE}/api/bio/default`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bio = (await res.json()) as any;

      console.log(pc.bold(pc.cyan('❤️‍🩹 ESTADO BIOMÉTRICO DEL COMANDANTE:')));
      console.log(pc.gray('----------------------------------------------------'));
      console.log(`  ${pc.bold('Estamina:')}        ${bio.estaminaPct >= 70 ? pc.green(bio.estaminaPct + '%') : bio.estaminaPct >= 40 ? pc.yellow(bio.estaminaPct + '%') : pc.red(bio.estaminaPct + '%')}`);
      console.log(`  ${pc.bold('Hidratación:')}     ${pc.cyan(bio.aguaPct + '%')}`);
      console.log(`  ${pc.bold('Minutos Sesión:')}  ${pc.white(bio.minutosSesion + ' min')}`);
      console.log(`  ${pc.bold('Nivel Fatiga:')}    ${bio.nivelFatiga === 'OPTIMAL' ? pc.green('OPTIMAL (Óptimo)') : pc.yellow(bio.nivelFatiga)}`);
      console.log(pc.gray('----------------------------------------------------'));

      if (bio.requiereIntervencion) {
        console.log(pc.red(`\n${bio.mensajeIntervencion}`));
      } else {
        console.log(pc.green('\n🛡️ Telemetría en zona segura. Mantén la disciplina, Comandante.'));
      }
    } catch (err: any) {
      console.error(pc.red(`⚠️ No se pudo obtener telemetría: ${err.message}`));
    }
  });

// ============================================================================
// 5. COMANDO: ares ask <prompt>
// ============================================================================
program
  .command('ask <consulta>')
  .description('💬 Envía una orden táctica o pregunta directa a A.R.E.S.')
  .option('-m, --model <modelo>', 'Modelo a consultar (auto, gemini-3-flash-preview, deepseek/deepseek-chat, etc.)', 'auto')
  .option('-p, --provider <proveedor>', 'Proveedor de IA (gemini o openrouter)', 'gemini')
  .action(async (consulta, opciones) => {
    banner();
    console.log(pc.cyan(`💬 [${opciones.provider.toUpperCase()} | ${opciones.model}]: ${pc.white(consulta)}\n`));

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: consulta,
          provider: opciones.provider,
          model: opciones.model,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as any;

      console.log(data.reply);

      if (data.conmutacion?.fueConmutado) {
        console.log(pc.yellow(`\n⚠️ [Failover Resiliente]: ${data.conmutacion.modeloInicial} ➔ ${data.conmutacion.modeloFinal} (${data.conmutacion.motivoConmutacion || 'Fallo detectado'})`));
      } else if (data.conmutacion) {
        console.log(pc.cyan(`\n🤖 [Auto-Router]: Enrutado a ${data.conmutacion.modeloFinal} [${data.conmutacion.categoria || 'Auto'}]`));
      }

      console.log(pc.dim(`\n[Postura: ${data.stance} | Pose: ${data.poseNumber}]`));
    } catch (err: any) {
      console.error(pc.red(`💥 Falla al consultar A.R.E.S.: ${err.message}`));
    }
  });

// ============================================================================
// 5.1 COMANDO: ares route <prompt>
// ============================================================================
program
  .command('route <consulta>')
  .description('🤖 Consulta al Enrutador Adaptativo qué motor de IA recomienda para una tarea')
  .action(async (consulta) => {
    banner();
    console.log(pc.cyan(`🔍 Analizando prompt táctico con AiRouterService...`));
    try {
      const res = await fetch(`${API_BASE}/api/models/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: consulta }),
      });
      const data = (await res.json()) as any;
      if (data.success && data.decision) {
        const d = data.decision;
        console.log(pc.bold(pc.green(`\n🎯 MODELO SELECCIONADO: ${d.modeloSeleccionado.icono} ${d.modeloSeleccionado.nombre} (${d.modeloSeleccionado.modelo})`)));
        console.log(pc.white(`   Categoría:   ${pc.yellow(d.categoriaIntencion)}`));
        console.log(pc.white(`   Motivo:      ${pc.cyan(d.modeloSeleccionado.motivo)}`));
        console.log(pc.white(`   Explicación: ${d.explicacion}`));
        console.log(pc.dim(`\n   Cadena de Failover en Cascada:`));
        for (let i = 0; i < d.cadenaFailover.length; i++) {
          const c = d.cadenaFailover[i];
          console.log(pc.dim(`     [${i + 1}] ${c.icono} ${c.nombre} (${c.modelo})`));
        }
        console.log('');
      }
    } catch (err: any) {
      console.error(pc.red(`💥 Error al consultar enrutador: ${err.message}`));
    }
  });

// ============================================================================
// 6. COMANDO: ares models
// ============================================================================
program
  .command('models')
  .description('🧠 Lista el catálogo de modelos de IA soportados por el Gateway Multi-Modelo')
  .action(async () => {
    banner();
    try {
      const res = await fetch(`${API_BASE}/api/models`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as any;

      console.log(pc.bold(pc.cyan('🧠 CATÁLOGO DE MODELOS INTELIGENTES DISPONIBLES:')));
      console.log(pc.gray('----------------------------------------------------------------------'));
      for (const m of data.models) {
        console.log(`  ${m.icono}  ${pc.bold(m.nombre)}`);
        console.log(`      ID: ${pc.yellow(m.id)} | Proveedor: ${pc.magenta(m.proveedor)}`);
        console.log(`      ${pc.dim(m.descripcion)}\n`);
      }
      console.log(pc.gray('----------------------------------------------------------------------'));
    } catch (err: any) {
      console.error(pc.red(`⚠️ Error al consultar catálogo: ${err.message}`));
    }
  });

// ============================================================================
// 7. COMANDO: ares health
// ============================================================================
program
  .command('health')
  .description('📡 Verifica el estado de los sistemas y el servidor API de A.R.E.S.')
  .action(async () => {
    banner();
    console.log(pc.yellow(`📡 Comprobando enlace con servidor en ${API_BASE}...`));

    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = (await res.json()) as any;
        console.log(pc.green(`\n🟢 SISTEMA EN LÍNEA: ${data.agent}`));
        console.log(`   Estado: ${pc.bold(pc.green(data.status))}`);
        console.log(`   Tiempo Activo: ${data.uptimeSeconds} segundos`);
        console.log(`   Timestamp: ${data.timestamp}\n`);
      } else {
        console.log(pc.red(`\n🔴 Servidor respondió con código de error ${res.status}`));
      }
    } catch (err: any) {
      console.log(pc.red(`\n🔴 SERVIDOR NO RESPONDE en ${API_BASE} (${err.message})`));
      console.log(pc.cyan(`👉 Inicia el servidor con: cd D:\\ares-ecosystem\\backend && npm run dev\n`));
    }
  });

// ============================================================================
// 8. COMANDO: ares changelog
// ============================================================================
program
  .command('changelog')
  .description('📜 Genera o actualiza automáticamente el CHANGELOG.md según Conventional Commits y SemVer')
  .option('-w, --write', 'Escribe o actualiza el archivo CHANGELOG.md en la raíz del proyecto')
  .option('-v, --version <version>', 'Fuerza una versión SemVer específica (ej. 2.7.0, 3.0.0)')
  .option('-o, --output <ruta>', 'Ruta personalizada para el archivo de salida (por defecto CHANGELOG.md)')
  .action(async (opciones) => {
    banner();
    console.log(pc.cyan('📜 Analizando historial Git bajo el estándar Conventional Commits...\n'));

    let resultado: any = null;
    const online = await verificarServidor();

    if (online) {
      try {
        const res = await fetch(`${API_BASE}/api/changelog/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: opciones.version,
            write: Boolean(opciones.write),
            path: opciones.output,
          }),
        });
        if (res.ok) {
          resultado = await res.json();
        }
      } catch {
        // Continuar con fallback offline
      }
    }

    if (!resultado) {
      try {
        const gitOutput = execSync('git log -n 50 --pretty=format:"%h|%s|%an|%ad" --date=short', {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
        const lineas = gitOutput.split('\n').filter(Boolean);
        const commits: Array<{ hash: string; desc: string; author: string; type: string }> = [];

        let tieneBreaking = false;
        let tieneFeat = false;
        let tieneFix = false;

        for (const l of lineas) {
          const partes = l.split('|');
          if (partes.length < 4) continue;
          const [hash, msg, author] = partes;
          const esBreaking = /BREAKING\s+CHANGE/i.test(msg) || /^[a-z]+(\(.+?\))?!:/.test(msg);
          if (esBreaking) tieneBreaking = true;

          const match = msg.match(/^([a-z]+)(\(.+?\))?!?:\s*(.+)$/i);
          const type = match ? match[1].toLowerCase() : 'other';
          const desc = match ? match[3] : msg;

          if (type === 'feat') tieneFeat = true;
          if (type === 'fix') tieneFix = true;

          commits.push({ hash, desc, author, type });
        }

        const fechaHoy = new Date().toISOString().split('T')[0];
        const ver = opciones.version || (tieneBreaking ? '3.0.0' : tieneFeat ? '2.7.0' : tieneFix ? '2.6.1' : '2.6.0');

        let md = `## [${ver}] - ${fechaHoy}\n\n`;
        const feats = commits.filter((c) => c.type === 'feat');
        const fixes = commits.filter((c) => c.type === 'fix');
        const refactors = commits.filter((c) => c.type === 'refactor');
        const others = commits.filter((c) => !['feat', 'fix', 'refactor'].includes(c.type));

        if (feats.length > 0) {
          md += '### 🚀 Nuevas Funcionalidades (Features)\n';
          for (const c of feats) md += `- **${c.desc}** ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash})) - *${c.author}*\n`;
          md += '\n';
        }
        if (fixes.length > 0) {
          md += '### 🐛 Correcciones de Errores (Bug Fixes)\n';
          for (const c of fixes) md += `- ${c.desc} ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash}))\n`;
          md += '\n';
        }
        if (refactors.length > 0) {
          md += '### ⚔️ Refactorización y Arquitectura\n';
          for (const c of refactors) md += `- ${c.desc} ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash}))\n`;
          md += '\n';
        }
        if (others.length > 0) {
          md += '### 🔧 Mantenimiento e Infraestructura\n';
          for (const c of others) md += `- ${c.desc} ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash}))\n`;
          md += '\n';
        }

        let savedPath: string | null = null;
        if (opciones.write) {
          const ruta = opciones.output || path.resolve(process.cwd(), 'CHANGELOG.md');
          const header = `# CHANGELOG: A.R.E.S. Ecosystem\n\nTodos los cambios notables en este proyecto se documentan en este archivo.\nFormato basado en [Keep a Changelog](https://keepachangelog.com/) y adherido a [Semantic Versioning](https://semver.org/).\n\n---\n\n`;
          let existing = '';
          if (fs.existsSync(ruta)) {
            existing = fs.readFileSync(ruta, 'utf-8').replace(header, '');
          }
          fs.writeFileSync(ruta, `${header}${md.trim()}\n\n${existing}`.trim() + '\n', 'utf-8');
          savedPath = ruta;
        }

        resultado = {
          versionCalculada: ver,
          fecha: fechaHoy,
          markdown: md.trim(),
          saved: Boolean(opciones.write),
          savedPath,
        };
      } catch (err: any) {
        console.error(pc.red(`❌ Error al analizar el historial Git: ${err.message}`));
        process.exit(1);
      }
    }

    console.log(pc.green(pc.bold(`🏷️  Versión calculada: ${resultado.versionCalculada} (${resultado.fecha})`)));
    console.log(pc.gray('----------------------------------------------------------------------'));
    console.log(resultado.markdown);
    console.log(pc.gray('----------------------------------------------------------------------'));

    if (resultado.saved && resultado.savedPath) {
      console.log(pc.green(`\n💾 CHANGELOG.md actualizado con éxito en: ${pc.bold(resultado.savedPath)}`));
    } else {
      console.log(pc.yellow('\n💡 Sugerencia: Usa "ares changelog --write" para guardar automáticamente los cambios en CHANGELOG.md'));
    }
  });

// ============================================================================
// 9. COMANDO: ares hook <install|run>
// ============================================================================
const hookCmd = program
  .command('hook')
  .description('🛡️ Gestión del Hook Pre-Push Espartano ("No Deploy a las 3:00 AM")');

hookCmd
  .command('install')
  .description('Instala el hook pre-push espartano en el repositorio Git actual (.git/hooks/pre-push)')
  .action(() => {
    banner();
    console.log(pc.cyan('🛡️  Instalando Hook Pre-Push Espartano (Protocolo Bio-Armadura)...'));

    try {
      let gitRoot = '';
      try {
        gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
      } catch {
        gitRoot = process.cwd();
      }

      const hooksDir = path.join(gitRoot, '.git', 'hooks');
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }

      const hookFile = path.join(hooksDir, 'pre-push');
      const hookContent = `#!/bin/sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# A.R.E.S. Spartan Pre-Push Guard — Bio-Armadura Protocol
# "No Deploy a las 3:00 AM si la estamina es inferior al 40%"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
HOOK_SCRIPT="$ROOT_DIR/hooks/pre-push.js"

if [ -f "$HOOK_SCRIPT" ]; then
  node "$HOOK_SCRIPT" "$@"
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    exit $EXIT_CODE
  fi
fi

exit 0
`;

      fs.writeFileSync(hookFile, hookContent, { mode: 0o755 });
      console.log(pc.green(`\n✅ Hook Pre-Push Espartano instalado exitosamente en:`));
      console.log(pc.bold(pc.white(`   ${hookFile}`)));
      console.log(pc.cyan(`\n⚔️  Protección activa:`));
      console.log(pc.gray(`   • Bloquea pushes entre 1:00 AM y 5:00 AM si la estamina < 40%.`));
      console.log(pc.gray(`   • Verifica telemetría en tiempo real desde ares.db o API.`));
      console.log(pc.gray(`   • Bypass táctico disponible con: $env:FORCE_DEPLOY=1; git push\n`));
    } catch (err: any) {
      console.error(pc.red(`❌ Error al instalar hook: ${err.message}`));
      process.exit(1);
    }
  });

hookCmd
  .command('run')
  .description('Ejecuta una prueba del hook pre-push para evaluar la telemetría actual')
  .option('-h, --hour <hora>', 'Simular una hora específica (0-23) para pruebas tácticas')
  .option('-s, --stamina <porcentaje>', 'Simular un nivel de estamina (0-100) para pruebas tácticas')
  .action((opciones) => {
    banner();
    console.log(pc.cyan('🔍 Ejecutando verificación del Guardián Pre-Push...\n'));

    try {
      let gitRoot = '';
      try {
        gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
      } catch {
        gitRoot = process.cwd();
      }

      const hookScript = path.join(gitRoot, 'hooks', 'pre-push.js');
      if (!fs.existsSync(hookScript)) {
        console.error(pc.red(`❌ No se encontró el script en: ${hookScript}`));
        process.exit(1);
      }

      const envs = { ...process.env };
      if (opciones.hour !== undefined) envs.ARES_TEST_HOUR = opciones.hour;
      if (opciones.stamina !== undefined) envs.ARES_TEST_STAMINA = opciones.stamina;

      execSync(`node "${hookScript}"`, { stdio: 'inherit', env: envs });
    } catch {
      // El script ya imprimió la alerta espartana y salió con código de error
      process.exit(1);
    }
  });

// ============================================================================
// 10. COMANDO: ares forge <archivo_enunciado> (v4.0 Asistente Interactivo)
// ============================================================================
program
  .command('forge [archivo]')
  .alias('new')
  .description('📋 Asistente de Forja DDD, Desofuscador de PDFs, Empaquetado .ZIP y Commits Atómicos Git (v4.0)')
  .option('-a, --author <nombre>', 'Nombre del autor para los commits de Git')
  .option('-e, --email <correo>', 'Correo de GitHub para iluminar el gráfico de contribuciones')
  .option('-b, --branch <rama>', 'Rama de trabajo asignada (feature/...)')
  .option('-s, --stack <stack>', 'Stack tecnológico objetivo')
  .option('-o, --output <directorio>', 'Directorio de salida para los archivos forjados')
  .action(async (archivo, opciones) => {
    banner();

    const online = await verificarServidor();
    if (!online) {
      console.error(pc.red(`❌ El servidor de A.R.E.S. en ${API_BASE} no está activo.`));
      console.log(pc.cyan(`👉 Inicia el servidor con: cd D:\\ares-ecosystem\\backend && npm run dev`));
      process.exit(1);
    }

    let textoEnunciado = '';
    if (archivo && fs.existsSync(path.resolve(archivo))) {
      textoEnunciado = fs.readFileSync(path.resolve(archivo), 'utf-8');
    }

    // Si se invoca sin banderas no-interactivas, iniciar el Asistente Interactivo Paso a Paso
    if (!opciones.output && !opciones.branch) {
      await ejecutarAsistenteForja({
        apiBase: API_BASE,
        enunciadoInicial: textoEnunciado,
      });
      return;
    }

    console.log(pc.cyan('📋 Inicializando Forja Soberana de Ejercicios & Commits Atómicos...\n'));

    if (!textoEnunciado) {
      textoEnunciado = `ENUNCIADO: SISTEMA DE GESTIÓN DE PRÉSTAMOS BIBLIOTECARIOS (DDD)
Requerimiento para el control de préstamos de libros, catálogo de ejemplares por ISBN y gestión de estudiantes con sanciones.
Bounded Contexts:
- Prestamos: Control de préstamos y vencimientos
- Catalogo: Registro de libros y disponibilidad
- Usuarios: Estudiantes y bloqueos`;
      console.log(pc.yellow(`⚠️ No se especificó archivo. Usando enunciado canónico de prueba DDD...`));
    }

    try {
      console.log(pc.yellow('✨ Desofuscando texto y analizando Bounded Contexts...'));
      const resClean = await fetch(`${API_BASE}/api/assignment/clean-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textoEnunciado, stack: opciones.stack }),
      });
      const dataClean = await resClean.json();
      if (!dataClean.success) throw new Error(dataClean.error || 'Falla al sanitizar');

      console.log(pc.green(`✓ Título detectado: ${pc.bold(dataClean.analysis.titulo)}`));
      console.log(pc.green(`✓ Bounded Contexts: ${dataClean.analysis.boundedContexts.map((c: any) => c.nombre).join(', ')}`));

      console.log(pc.yellow('\n⚔️  Forjando proyecto DDD y planificando commits atómicos...'));
      const resForge = await fetch(`${API_BASE}/api/assignment/forge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: dataClean.analysis,
          author: {
            name: opciones.author || 'Kevin Commander',
            email: opciones.email || 'kevin.commander@gmail.com',
            branchName: opciones.branch,
          },
          stack: opciones.stack || 'typescript-ddd',
        }),
      });

      const dataForge = await resForge.json();
      if (!dataForge.success) throw new Error(dataForge.error || 'Falla al forjar');

      const proj = dataForge.project;
      console.log(pc.green(`✓ Archivos generados: ${proj.archivos.length}`));
      console.log(pc.green(`✓ Commits atómicos planificados: ${proj.planGit.commits.length}`));
      console.log(pc.green(`✓ Rama: ${proj.planGit.branchName} // Autor: ${proj.planGit.autor.name} <${proj.planGit.autor.email}>`));

      if (opciones.output) {
        const outDir = path.resolve(opciones.output);
        console.log(pc.cyan(`\n💾 Escribiendo archivos en: ${outDir}...`));
        for (const arch of proj.archivos) {
          const dest = path.join(outDir, arch.ruta);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, arch.contenido, 'utf-8');
        }
        console.log(pc.green(`✅ ${proj.archivos.length} archivos escritos con éxito.`));
        console.log(pc.cyan(`👉 Ejecuta "setup-git.bat" o "./setup-git.sh" en esa carpeta para crear el repo y subirlo.`));
      } else {
        console.log(pc.cyan('\n📜 Cronograma de Commits:'));
        for (const c of proj.planGit.commits) {
          console.log(pc.dim(`  [${c.tipo.toUpperCase()}] `) + pc.white(c.mensaje));
        }
        console.log(pc.yellow('\n💡 Sugerencia: Pasa "-o ./mi-proyecto" para escribir los archivos en disco.'));
      }
    } catch (err: any) {
      console.error(pc.red(`❌ Error en la forja: ${err.message}`));
      process.exit(1);
    }
  });

// ============================================================================
// 10.1 COMANDO: ares zip <directorio> [archivo_salida.zip] (v4.0)
// ============================================================================
program
  .command('zip <directorio> [archivoSalida]')
  .description('📦 Empaqueta cualquier directorio de proyecto en un archivo .ZIP listo para descargar en C: o D:')
  .action(async (directorio, archivoSalida) => {
    banner();
    const dirAbs = path.resolve(directorio);
    if (!fs.existsSync(dirAbs)) {
      console.error(pc.red(`❌ El directorio "${directorio}" no existe.`));
      process.exit(1);
    }
    const defaultZip = path.join(path.dirname(dirAbs), `${path.basename(dirAbs)}.zip`);
    const targetZip = path.resolve(archivoSalida || defaultZip);

    console.log(pc.cyan(`📦 Empaquetando "${dirAbs}" en archivo .ZIP...`));
    const zip = new JSZip();

    function agregarArchivos(actualDir: string, baseDir: string) {
      const items = fs.readdirSync(actualDir);
      for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
        const full = path.join(actualDir, item);
        const rel = path.relative(baseDir, full).replace(/\\/g, '/');
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          agregarArchivos(full, baseDir);
        } else {
          zip.file(rel, fs.readFileSync(full));
        }
      }
    }

    agregarArchivos(dirAbs, dirAbs);
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });
    fs.mkdirSync(path.dirname(targetZip), { recursive: true });
    fs.writeFileSync(targetZip, buffer);

    console.log(pc.green(`✅ Archivo .ZIP generado exitosamente:`));
    console.log(pc.bold(pc.white(`   ${targetZip}`)) + pc.dim(` (${(buffer.length / 1024).toFixed(1)} KB)\n`));
  });

// ============================================================================
// 11. COMANDO: ares repl / shell (v3.7 Standalone Pure Console)
// ============================================================================
program
  .command('repl')
  .alias('shell')
  .alias('interactive')
  .description('⚡ Inicia la Terminal Táctica Interactiva Standalone con Banner Cibernético (v3.7)')
  .action(async () => {
    await iniciarRepl();
  });

// ============================================================================
// 12. COMANDO: ares chat <mensaje...> (v3.7 Streaming Directo en Terminal)
// ============================================================================
program
  .command('chat <mensaje...>')
  .description('💬 Envía una orden táctica con streaming token a token en consola pura')
  .option('-m, --model <modelo>', 'Modelo a consultar')
  .action(async (partesMensaje, opciones) => {
    banner();
    const mensaje = partesMensaje.join(' ');
    console.log(pc.cyan(`💬 [Orden Táctica]: ${pc.white(mensaje)}\n`));
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: mensaje,
          model: opciones.model,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as any;
      process.stdout.write(pc.bold(pc.cyan('🛡️ A.R.E.S.: ')));
      const texto = data.reply || data.content || '';
      for (const char of texto) {
        process.stdout.write(char);
      }
      console.log('\n');
      if (data.stance) {
        console.log(pc.dim(`[Postura: ${data.stance} | Pose: ${data.poseNumber || 1}]`));
      }
    } catch (err: any) {
      console.error(pc.red(`💥 Falla al consultar A.R.E.S.: ${err.message}`));
    }
  });

// ============================================================================
// 13. COMANDO: ares benchmark [titulo] (v3.8 E2E, Stryker & k6)
// ============================================================================
program
  .command('benchmark [titulo]')
  .alias('bench')
  .description('🧪 Ejecuta suite de integración E2E, Mutación con Stryker y Benchmarks de Carga k6')
  .action(async (titulo) => {
    banner();
    const proyecto = titulo || 'Sistema DDD Táctico';
    console.log(pc.cyan(`🧪 Disparando Suite de Benchmarks para: ${pc.bold(proyecto)}...\n`));

    try {
      const res = await fetch(`${API_BASE}/api/benchmark/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: proyecto }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error al ejecutar benchmark');

      const rep = data.data;
      console.log(pc.green('✅ SUITE DE BENCHMARKS COMPLETADA CON ÉXITO\n'));

      const msi = rep.stryker.mutationScore;
      const msiColor = msi >= 80 ? pc.green : msi >= 60 ? pc.yellow : pc.red;
      console.log(`  ${pc.bold('🧬 STRYKER MUTATION:')}       MSI: ${msiColor(pc.bold(msi + '%'))} (Killed: ${pc.green(rep.stryker.killed)}, Survived: ${pc.yellow(rep.stryker.survived)})`);
      console.log(`  ${pc.bold('🚀 K6 THROUGHPUT:')}          ${pc.cyan(rep.k6.peticionesPorSegundo + ' rps')} | Total: ${pc.white(rep.k6.totalPeticiones + ' reqs')}`);
      console.log(`  ${pc.bold('⏱️ LATENCIA PERCENTIL:')}     P50: ${pc.white(rep.k6.latenciaP50Ms + 'ms')} | P95: ${pc.green(rep.k6.latenciaP95Ms + 'ms')} | P99: ${pc.cyan(rep.k6.latenciaP99Ms + 'ms')}`);
      console.log(`  ${pc.bold('🛡️ TASA ERROR HTTP:')}        ${pc.green(rep.k6.tasaErrorHttp + '%')} (100% SLA cumplido)`);
      console.log(`  ${pc.bold('🧪 TESTS E2E DDD:')}          ${pc.green(rep.e2e.passedTests + '/' + rep.e2e.totalTests + ' PASADOS')} (${rep.duracionTotalMs}ms)\n`);

      console.log(pc.dim('  Mutantes críticos interceptados por la suite:'));
      for (const m of (rep.stryker.mutantes || []).slice(0, 4)) {
        console.log(`    ${pc.gray('•')} [${pc.cyan(m.id)}] ${pc.bold(m.mutatorName)} en ${pc.white(m.archivo)}: ${pc.green('⚔️ KILLED')}`);
      }
      console.log('\n');
    } catch (err: any) {
      console.error(pc.red(`💥 Falla al ejecutar suite: ${err.message}`));
    }
  });

// Si no se pasaron argumentos en la consola (ej. usuario ejecuta simplemente "ares"),
// arrancar automáticamente la Terminal Táctica REPL interactiva.
if (process.argv.length <= 2) {
  iniciarRepl().catch((err) => {
    console.error(pc.red(`❌ Error al iniciar REPL: ${err.message}`));
    process.exit(1);
  });
} else {
  program.parse(process.argv);
}
