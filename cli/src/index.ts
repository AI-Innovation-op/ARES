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
import dotenv from 'dotenv';

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
  console.log(pc.cyan(`
   █████╗ ██████╗ ███████╗███████╗
  ██╔══██╗██╔══██╗██╔════╝██╔════╝
  ███████║██████╔╝█████╗  ███████╗
  ██╔══██║██╔══██╗██╔══╝  ╚════██║
  ██║  ██║██║  ██║███████╗███████║ v2.6 TACTICAL CLI
  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝ [J.A.R.V.I.S. Core]
`));
  console.log(pc.dim('  Autonomous Resilient Engineering & Software-Documentation God\n'));
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
  .description('🛡️ A.R.E.S. CLI Táctico — Ingeniería de Software Full-Stack asistida por IA')
  .version('2.6.0');

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
  .option('-m, --model <modelo>', 'Modelo a consultar (gemini-3-flash-preview, deepseek/deepseek-chat, etc.)')
  .option('-p, --provider <proveedor>', 'Proveedor de IA (gemini o openrouter)', 'openrouter')
  .action(async (consulta, opciones) => {
    banner();
    console.log(pc.cyan(`💬 [${opciones.provider.toUpperCase()} | ${opciones.model || 'default'}]: ${pc.white(consulta)}\n`));

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
      console.log(pc.dim(`\n[Postura: ${data.stance} | Pose: ${data.poseNumber}]`));
    } catch (err: any) {
      console.error(pc.red(`💥 Falla al consultar A.R.E.S.: ${err.message}`));
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

program.parse(process.argv);
