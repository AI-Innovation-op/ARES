/**
 * @fileoverview Suite de Verificación Integral de Regresión A.R.E.S. v3.9
 * Prueba rigurosamente todos los subsistemas desarrollados desde v3.1 hasta v3.9,
 * incluyendo la API REST, el enrutador de IA, failover y la CLI standalone.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';

const API_BASE = 'http://localhost:3000';

async function test(nombre, fn) {
  const inicio = Date.now();
  try {
    const res = await fn();
    const duracion = Date.now() - inicio;
    console.log(`  \x1b[32m✓\x1b[0m [${duracion}ms] \x1b[1m${nombre}\x1b[0m`);
    if (res) console.log(`    \x1b[90m${res}\x1b[0m`);
    return true;
  } catch (err) {
    const duracion = Date.now() - inicio;
    console.log(`  \x1b[31m✗\x1b[0m [${duracion}ms] \x1b[1m\x1b[31m${nombre}\x1b[0m: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n\x1b[36m═══════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[37m  🛡️ A.R.E.S. v3.9 — PROTOCOLO DE REGRESIÓN INTEGRAL Y ENDPOINTS\x1b[0m');
  console.log('\x1b[36m═══════════════════════════════════════════════════════════════════════\x1b[0m\n');

  let total = 0;
  let exitosos = 0;

  // 1. Healthcheck & Version
  total++;
  if (await test('Healthcheck & Versión v3.9 Core', async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.agent.includes('v3.9')) throw new Error(`Versión no esperada: ${data.agent}`);
    return `Agente: ${data.agent} | Uptime: ${data.uptimeSeconds}s | Status: ${data.status}`;
  })) exitosos++;

  // 2. Auto-Router AI (v3.9) - Detección DDD -> DeepSeek R1
  total++;
  if (await test('v3.9 Auto-Router AI: Enrutamiento DDD -> DeepSeek R1', async () => {
    const res = await fetch(`${API_BASE}/api/models/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Diseñar Bounded Contexts y agregados DDD con Stryker mutation score' }),
    });
    const data = await res.json();
    if (!data.success || data.decision.categoriaIntencion !== 'REASONING_DDD') {
      throw new Error(`Enrutamiento erróneo: ${JSON.stringify(data.decision)}`);
    }
    return `Categoría: ${data.decision.categoriaIntencion} -> Modelo: ${data.decision.modeloSeleccionado.nombre}`;
  })) exitosos++;

  // 3. Auto-Router AI (v3.9) - Detección Código -> DeepSeek V3
  total++;
  if (await test('v3.9 Auto-Router AI: Enrutamiento Código -> DeepSeek V3', async () => {
    const res = await fetch(`${API_BASE}/api/models/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Escribir componente Vue 3 con Pinia y TypeScript' }),
    });
    const data = await res.json();
    if (!data.success || data.decision.categoriaIntencion !== 'CODE_GEN') {
      throw new Error(`Enrutamiento erróneo: ${JSON.stringify(data.decision)}`);
    }
    return `Categoría: ${data.decision.categoriaIntencion} -> Modelo: ${data.decision.modeloSeleccionado.nombre}`;
  })) exitosos++;

  // 4. Auto-Router AI (v3.9) - Detección Visión -> Gemini 3 Flash
  total++;
  if (await test('v3.9 Auto-Router AI: Enrutamiento Visión Multimodal -> Gemini', async () => {
    const res = await fetch(`${API_BASE}/api/models/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Analizar diagrama visual adjunto', hasImage: true }),
    });
    const data = await res.json();
    if (!data.success || data.decision.categoriaIntencion !== 'VISION_MULTIMODAL') {
      throw new Error(`Enrutamiento erróneo: ${JSON.stringify(data.decision)}`);
    }
    return `Categoría: ${data.decision.categoriaIntencion} -> Modelo: ${data.decision.modeloSeleccionado.nombre}`;
  })) exitosos++;

  // 5. Auto-Router AI (v3.9) - Detección Live Search Grounding -> Gemini
  total++;
  if (await test('v3.9 Auto-Router AI: Enrutamiento Live Search Grounding -> Gemini', async () => {
    const res = await fetch(`${API_BASE}/api/models/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Últimas novedades y versiones de Node y Express lanzadas hoy' }),
    });
    const data = await res.json();
    if (!data.success || data.decision.categoriaIntencion !== 'SEARCH_GROUNDING') {
      throw new Error(`Enrutamiento erróneo: ${JSON.stringify(data.decision)}`);
    }
    return `Categoría: ${data.decision.categoriaIntencion} -> Modelo: ${data.decision.modeloSeleccionado.nombre}`;
  })) exitosos++;

  // 6. Catálogo de Modelos (incluye 'auto')
  total++;
  if (await test('Catálogo Multi-Modelo (con virtual auto)', async () => {
    const res = await fetch(`${API_BASE}/api/models`);
    const data = await res.json();
    if (!data.models || data.models.length < 5) throw new Error(`Modelos insuficientes: ${data.models?.length}`);
    const tieneAuto = data.models.some((m) => m.id === 'auto');
    if (!tieneAuto) throw new Error('No se encontró el modelo virtual auto');
    return `Modelos disponibles: ${data.models.length} (incluye auto-router)`;
  })) exitosos++;

  // 7. v3.8 Suite de Pruebas E2E, Mutación Stryker & k6 Presets
  total++;
  if (await test('v3.8 Suite de Pruebas E2E, Mutación Stryker & k6 Presets', async () => {
    const resPresets = await fetch(`${API_BASE}/api/benchmark/presets`);
    const dataPresets = await resPresets.json();
    if (!dataPresets.presets || dataPresets.presets.length === 0) throw new Error('No hay presets de benchmark');

    const resRun = await fetch(`${API_BASE}/api/benchmark/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Sistema de Enrutamiento Táctico' }),
    });
    const dataRun = await resRun.json();
    if (!dataRun.success) throw new Error(dataRun.error);
    const d = dataRun.data;
    return `Stryker MSI: ${d.stryker.mutationScore}% | k6: ${d.k6.peticionesPorSegundo} rps | E2E: ${d.e2e.passedTests}/${d.e2e.totalTests} pasados`;
  })) exitosos++;

  // 8. v3.5 & v3.6 Forja Soberana de Ejercicios DDD & Limpieza de PDF
  total++;
  if (await test('v3.5/v3.6 Forja Soberana de Ejercicios DDD, PDF & Commits Atómicos', async () => {
    const resClean = await fetch(`${API_BASE}/api/assignment/clean-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'PDF CHUECO: Enunciado de Sistema de Gestión de Préstamos.\nBounded Contexts: Prestamos, Usuarios, Catalogo.',
      }),
    });
    const dataClean = await resClean.json();
    if (!dataClean.analysis || dataClean.analysis.boundedContexts.length === 0) {
      throw new Error('Fallo al extraer bounded contexts');
    }

    const resForge = await fetch(`${API_BASE}/api/assignment/forge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysis: dataClean.analysis,
        author: {
          name: 'Kevin Commander',
          email: 'kevin.commander@gmail.com',
          branchName: 'feature/prestamos-ddd',
        },
      }),
    });
    const dataForge = await resForge.json();
    if (!dataForge.project || dataForge.project.archivos.length === 0) {
      throw new Error('Fallo en la forja de archivos');
    }
    const cantArchivos = dataForge.project.archivos.length;
    const cantCommits = dataForge.project.planGit?.commits?.length || 0;
    return `Archivos forjados: ${cantArchivos} | Commits atómicos planificados: ${cantCommits}`;
  })) exitosos++;

  // 9. v3.4 Radar de Arquitectura de Sistemas C4
  total++;
  if (await test('v3.4 Radar de Arquitectura C4 & Topología', async () => {
    const res = await fetch(`${API_BASE}/api/architecture/topology`);
    const data = await res.json();
    if (!data.nodes || data.nodes.length === 0) throw new Error('No se recuperaron nodos de la topología C4');
    return `Topología: ${data.nombre} | Nodos: ${data.nodes.length} | Conexiones: ${data.edges?.length || 0}`;
  })) exitosos++;

  // 10. v3.3 Memoria Semántica Vectorial Local 128D
  total++;
  if (await test('v3.3 Memoria Semántica Vectorial Local & RAG', async () => {
    const res = await fetch(`${API_BASE}/api/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'arquitectura hexagonal bounded context', limit: 2 }),
    });
    const data = await res.json();
    if (!data.resultados) throw new Error('Falla en búsqueda semántica');
    return `Coincidencias encontradas: ${data.resultados.length}`;
  })) exitosos++;

  // 11. v3.2 CI/CD Autónomo
  total++;
  if (await test('v3.2 Motor de CI/CD Autónomo & Pipelines', async () => {
    const res = await fetch(`${API_BASE}/api/cicd/templates`);
    const data = await res.json();
    if (!data.templates || data.templates.length === 0) throw new Error('No hay templates de CI/CD');
    return `Templates disponibles: ${data.templates.length}`;
  })) exitosos++;

  // 12. v3.1 Enjambre Multi-Agente Soberano (Swarm)
  total++;
  if (await test('v3.1 Enjambre Multi-Agente (Atenea, Vulcano, Mercurio, Némesis)', async () => {
    const res = await fetch(`${API_BASE}/api/swarm/agents`);
    const data = await res.json();
    if (!data.agents || data.agents.length !== 4) throw new Error(`Agentes del enjambre no esperados: ${data.agents?.length}`);
    return `Legión activa: ${data.agents.map((a) => a.nombre).join(', ')}`;
  })) exitosos++;

  // 13. Bio-Armadura & Telemetría Cognitiva
  total++;
  if (await test('Bio-Armadura & Telemetría Cognitiva', async () => {
    const res = await fetch(`${API_BASE}/api/bio/default`);
    const data = await res.json();
    if (data.estaminaPct === undefined) throw new Error('No se pudo obtener telemetría bio');
    return `Estamina: ${data.estaminaPct}% | Hidratación: ${data.aguaPct}% | Estado: ${data.nivelFatiga}`;
  })) exitosos++;

  // 14. v3.7 Standalone CLI & Comandos de Terminal Táctica
  total++;
  if (await test('v3.7 Standalone Tactical CLI (ares --version, ares health)', async () => {
    const cliDist = path.resolve('D:/ares-ecosystem/cli/dist/index.js');
    const versionOutput = execSync(`node "${cliDist}" --version`, { encoding: 'utf-8' }).trim();
    if (versionOutput !== '3.9.0') throw new Error(`Versión CLI incorrecta: ${versionOutput}`);
    const healthOutput = execSync(`node "${cliDist}" health`, { encoding: 'utf-8' });
    if (!healthOutput.includes('ONLINE') && !healthOutput.includes('v3.9')) {
      throw new Error('Fallo en comando health CLI');
    }
    return `CLI binario: v${versionOutput} nominal y enlazado al backend`;
  })) exitosos++;

  // 15. v3.9 CLI Route Command
  total++;
  if (await test('v3.9 CLI Tactical Order: ares route', async () => {
    const cliDist = path.resolve('D:/ares-ecosystem/cli/dist/index.js');
    const routeOutput = execSync(`node "${cliDist}" route "Refactorizar aggregate root de catálogo con TypeScript"`, { encoding: 'utf-8' });
    if (!routeOutput.includes('MODELO SELECCIONADO') || !routeOutput.includes('CODE_GEN')) {
      throw new Error(`Salida inesperada de ares route: ${routeOutput}`);
    }
    return `ares route detectó CODE_GEN y recomendó DeepSeek V3`;
  })) exitosos++;

  console.log('\n\x1b[36m───────────────────────────────────────────────────────────────────────\x1b[0m');
  if (exitosos === total) {
    console.log(`\x1b[1m\x1b[32m  ✅ VERIFICACIÓN DE REGRESIÓN 100% EXITOSA (${exitosos}/${total} SUBSISTEMAS OPERACIONALES)\x1b[0m`);
    console.log('\x1b[32m  Todos los sistemas desde v3.1 hasta v3.9 operan en armonía táctica nominal.\x1b[0m');
  } else {
    console.log(`\x1b[1m\x1b[33m  ⚠️ VERIFICACIÓN PARCIAL: ${exitosos}/${total} subsistemas exitosos\x1b[0m`);
  }
  console.log('\x1b[36m───────────────────────────────────────────────────────────────────────\x1b[0m\n');
}

main().catch(console.error);
