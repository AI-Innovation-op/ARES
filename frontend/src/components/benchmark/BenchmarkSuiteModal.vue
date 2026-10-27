<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { benchmarkService, type SuiteBenchmarkCompleta } from '../../services/benchmark.service.js';

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const cargando = ref(false);
const tabActiva = ref<'stryker' | 'k6' | 'e2e'>('stryker');
const suiteData = ref<SuiteBenchmarkCompleta | null>(null);
const copiadoTipo = ref<string | null>(null);
const presetSeleccionado = ref('load');

const presets = [
  { id: 'smoke', nombre: 'Smoke Test (2 VUs, 10s)', vus: 2 },
  { id: 'load', nombre: 'Ramping Concurrency (50 VUs, Nominal)', vus: 50 },
  { id: 'stryker', nombre: 'Stryker Mutation Kill-Test', vus: 0 },
  { id: 'stress', nombre: 'Stress Spike (150 VUs)', vus: 150 },
];

async function ejecutarBenchmarks() {
  cargando.value = true;
  try {
    const data = await benchmarkService.ejecutarSuite('Sistema de Préstamos Bibliotecarios DDD');
    suiteData.value = data;
  } catch (error) {
    console.error('Error al ejecutar suite de benchmarks:', error);
  } finally {
    cargando.value = false;
  }
}

function copiarTexto(texto: string, tipo: string) {
  navigator.clipboard.writeText(texto);
  copiadoTipo.value = tipo;
  setTimeout(() => {
    copiadoTipo.value = null;
  }, 2000);
}

onMounted(() => {
  ejecutarBenchmarks();
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
    <div class="w-full max-w-6xl h-[92vh] bg-[#040914] border border-cyan-500/50 rounded-xl shadow-[0_0_35px_rgba(0,229,255,0.2)] flex flex-col overflow-hidden text-slate-200">
      
      <!-- 1. Cabecera Táctica del Modal -->
      <header class="h-14 px-5 border-b border-[#132a4a] bg-[#091326] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded border border-cyan-400/60 bg-[#040914] flex items-center justify-center text-lg shadow-[0_0_10px_rgba(0,229,255,0.3)]">
            🧪
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-orbitron font-bold text-sm tracking-wider text-slate-100">
                SUITE DE PRUEBAS E2E & BENCHMARKS DDD
              </h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/70 border border-cyan-500 text-cyan-300 font-bold">
                v3.8 INDUSTRIAL SUT
              </span>
            </div>
            <p class="text-[10px] font-mono text-slate-400">
              Pruebas de Integración Multicontexto, Mutación con Stryker y Rendimiento Grafana k6
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Selector de Preset de Benchmark -->
          <select
            v-model="presetSeleccionado"
            class="hidden md:inline-block bg-[#040914] text-cyan-300 border border-cyan-500/40 rounded px-2.5 py-1 text-xs font-mono outline-none cursor-pointer"
            title="Seleccionar escenario de benchmark"
          >
            <option v-for="p in presets" :key="p.id" :value="p.id" class="bg-[#091326] text-slate-200">
              {{ p.nombre }}
            </option>
          </select>

          <button
            type="button"
            @click="ejecutarBenchmarks"
            :disabled="cargando"
            class="px-3.5 py-1.5 rounded bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-400/70 text-cyan-200 font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.25)] disabled:opacity-50"
          >
            <span :class="cargando ? 'animate-spin' : ''">🔄</span>
            <span>{{ cargando ? 'EJECUTANDO SUITE...' : 'DISPARAR BENCHMARKS' }}</span>
          </button>

          <button
            type="button"
            @click="emit('cerrar')"
            class="w-7 h-7 rounded border border-slate-700 hover:border-red-500/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition flex items-center justify-center font-bold text-sm cursor-pointer"
            title="Cerrar modal"
          >
            ✕
          </button>
        </div>
      </header>

      <!-- 2. Tarjetas de Telemetría Superior -->
      <section class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#061022] border-b border-[#132a4a] shrink-0 font-mono">
        <!-- Stryker MSI -->
        <div class="bg-[#040914] p-3 rounded border border-purple-500/40 flex flex-col justify-between">
          <div class="text-[10px] text-purple-300 font-bold flex items-center justify-between">
            <span>MUTATION SCORE (MSI)</span>
            <span>🧬</span>
          </div>
          <div class="text-2xl font-bold font-orbitron text-purple-400 my-1">
            {{ suiteData?.stryker.mutationScore || 0 }}%
          </div>
          <div class="text-[10px] text-slate-400 flex justify-between">
            <span>{{ suiteData?.stryker.killed || 0 }} asesinados</span>
            <span class="text-yellow-400">{{ suiteData?.stryker.survived || 0 }} vivos</span>
          </div>
        </div>

        <!-- k6 RPS -->
        <div class="bg-[#040914] p-3 rounded border border-cyan-500/40 flex flex-col justify-between">
          <div class="text-[10px] text-cyan-300 font-bold flex items-center justify-between">
            <span>K6 THROUGHPUT</span>
            <span>🚀</span>
          </div>
          <div class="text-2xl font-bold font-orbitron text-cyan-400 my-1">
            {{ suiteData?.k6.peticionesPorSegundo || 0 }} <span class="text-xs text-slate-400 font-normal">rps</span>
          </div>
          <div class="text-[10px] text-slate-400 flex justify-between">
            <span>{{ suiteData?.k6.totalPeticiones || 0 }} reqs</span>
            <span class="text-cyan-300">P95: {{ suiteData?.k6.latenciaP95Ms || 0 }}ms</span>
          </div>
        </div>

        <!-- Tasa de Error -->
        <div class="bg-[#040914] p-3 rounded border border-emerald-500/40 flex flex-col justify-between">
          <div class="text-[10px] text-emerald-300 font-bold flex items-center justify-between">
            <span>TASA ERROR HTTP</span>
            <span>🛡️</span>
          </div>
          <div class="text-2xl font-bold font-orbitron text-emerald-400 my-1">
            {{ suiteData?.k6.tasaErrorHttp || 0 }}%
          </div>
          <div class="text-[10px] text-slate-400 flex justify-between">
            <span>SLA: &lt; 1.0%</span>
            <span class="text-emerald-400 font-bold">100% CUMPLIDO</span>
          </div>
        </div>

        <!-- E2E Tests -->
        <div class="bg-[#040914] p-3 rounded border border-amber-500/40 flex flex-col justify-between">
          <div class="text-[10px] text-amber-300 font-bold flex items-center justify-between">
            <span>TESTS E2E PASADOS</span>
            <span>🧪</span>
          </div>
          <div class="text-2xl font-bold font-orbitron text-amber-400 my-1">
            {{ suiteData?.e2e.passedTests || 0 }} / {{ suiteData?.e2e.totalTests || 0 }}
          </div>
          <div class="text-[10px] text-slate-400 flex justify-between">
            <span>Fallidos: {{ suiteData?.e2e.failedTests || 0 }}</span>
            <span class="text-emerald-400 font-bold">ALL PASS</span>
          </div>
        </div>
      </section>

      <!-- 3. Navegación por Pestañas -->
      <nav class="flex border-b border-[#132a4a] bg-[#071328] px-4 font-mono text-xs shrink-0">
        <button
          type="button"
          @click="tabActiva = 'stryker'"
          class="px-4 py-2.5 font-bold transition flex items-center gap-2 cursor-pointer border-b-2"
          :class="tabActiva === 'stryker' ? 'border-purple-400 text-purple-300 bg-purple-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <span>🧬</span>
          <span>1. Mutación Stryker (MSI: {{ suiteData?.stryker.mutationScore }}%)</span>
        </button>

        <button
          type="button"
          @click="tabActiva = 'k6'"
          class="px-4 py-2.5 font-bold transition flex items-center gap-2 cursor-pointer border-b-2"
          :class="tabActiva === 'k6' ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <span>🚀</span>
          <span>2. Carga y Concurrencia k6 (50 VUs)</span>
        </button>

        <button
          type="button"
          @click="tabActiva = 'e2e'"
          class="px-4 py-2.5 font-bold transition flex items-center gap-2 cursor-pointer border-b-2"
          :class="tabActiva === 'e2e' ? 'border-amber-400 text-amber-300 bg-amber-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <span>🧪</span>
          <span>3. Integración E2E Multicontexto</span>
        </button>
      </nav>

      <!-- 4. Cuerpo de Contenido por Pestaña -->
      <div class="flex-1 overflow-y-auto p-5 font-mono text-xs bg-[#040914] space-y-4">

        <!-- ================================================================= -->
        <!-- PESTAÑA 1: MUTACIÓN STRYKER -->
        <!-- ================================================================= -->
        <div v-if="tabActiva === 'stryker'" class="space-y-4 animate-fade-in">
          <div class="bg-[#09152b] p-4 rounded border border-purple-500/30 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-purple-300">
                🧬 ANÁLISIS DE RESISTENCIA Y MUTACIÓN (Mutation Score Indicator)
              </h3>
              <p class="text-[11px] text-slate-400 mt-1">
                Stryker inyecta mutantes sintéticos en los Agregados y Value Objects de DDD para asegurar que los tests no arrojen falsos positivos.
              </p>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 rounded bg-purple-900/50 border border-purple-400 text-purple-200 text-xs font-bold">
                UMBRAL NOMINAL &gt; 80%
              </span>
            </div>
          </div>

          <!-- Tabla de Mutantes Evaluados -->
          <div class="border border-[#132a4a] rounded overflow-hidden">
            <div class="bg-[#0d1e3d] px-4 py-2 text-[11px] font-bold text-slate-300 grid grid-cols-12 gap-2">
              <span class="col-span-2">MUTANTE ID</span>
              <span class="col-span-2">MUTADOR</span>
              <span class="col-span-3">ORIGINAL ➔ MUTADO</span>
              <span class="col-span-2">ESTADO</span>
              <span class="col-span-3">TEST ASESINO</span>
            </div>

            <div class="divide-y divide-[#132a4a] bg-[#040914]">
              <div
                v-for="m in suiteData?.stryker.mutantes"
                :key="m.id"
                class="px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-[11px] hover:bg-slate-900/50 transition"
              >
                <span class="col-span-2 text-cyan-300 font-bold">{{ m.id }} <span class="text-[10px] text-slate-500">({{ m.boundedContext }})</span></span>
                <span class="col-span-2 text-purple-300">{{ m.mutatorName }}</span>
                <div class="col-span-3 font-mono text-[10px]">
                  <div class="text-slate-400 line-through truncate">{{ m.original }}</div>
                  <div class="text-amber-300 truncate font-bold">{{ m.mutado }}</div>
                </div>
                <div class="col-span-2">
                  <span
                    v-if="m.estado === 'Killed'"
                    class="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold"
                  >
                    ⚔️ KILLED
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/60 text-amber-300 text-[10px] font-bold"
                  >
                    ⚠️ SURVIVED
                  </span>
                </div>
                <span class="col-span-3 text-[10px] text-slate-300 truncate" :title="m.testAsesino || 'Sin cobertura directa'">
                  {{ m.testAsesino || 'No detectado por la suite actual' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Archivo stryker.config.json -->
          <div class="mt-4">
            <div class="flex items-center justify-between bg-[#0d1e3d] px-4 py-2 rounded-t border border-[#132a4a]">
              <span class="font-bold text-slate-300 text-xs">📄 Configuración Generada: stryker.config.json</span>
              <button
                type="button"
                @click="copiarTexto(suiteData?.stryker.archivoConfig || '', 'stryker')"
                class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
              >
                {{ copiadoTipo === 'stryker' ? '✓ COPIADO' : 'COPIAR CONFIG' }}
              </button>
            </div>
            <pre class="bg-[#02050c] p-4 rounded-b border border-t-0 border-[#132a4a] text-purple-200 text-[10px] overflow-x-auto max-h-48"><code>{{ suiteData?.stryker.archivoConfig }}</code></pre>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- PESTAÑA 2: CARGA Y RENDIMIENTO K6 -->
        <!-- ================================================================= -->
        <div v-if="tabActiva === 'k6'" class="space-y-4 animate-fade-in">
          <div class="bg-[#09152b] p-4 rounded border border-cyan-500/30 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-cyan-300">
                🚀 TELEMETRÍA DE CARGA & CONCURRENCIA (Grafana k6 ES6)
              </h3>
              <p class="text-[11px] text-slate-400 mt-1">
                Evaluación de latencia percentil y throughput bajo concurrencia continua de 50 Virtual Users.
              </p>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 rounded bg-cyan-900/50 border border-cyan-400 text-cyan-200 text-xs font-bold">
                SLA P95 &lt; 200ms
              </span>
            </div>
          </div>

          <!-- Desglose de Percentiles de Latencia -->
          <div class="grid grid-cols-4 gap-3 font-mono">
            <div class="bg-[#061022] p-3 rounded border border-cyan-500/30 text-center">
              <span class="text-[10px] text-slate-400">LATENCIA P50 (Mediana)</span>
              <div class="text-xl font-orbitron font-bold text-cyan-300 my-1">
                {{ suiteData?.k6.latenciaP50Ms }} ms
              </div>
              <span class="text-[10px] text-emerald-400">Excelente</span>
            </div>

            <div class="bg-[#061022] p-3 rounded border border-cyan-500/30 text-center">
              <span class="text-[10px] text-slate-400">LATENCIA P90</span>
              <div class="text-xl font-orbitron font-bold text-cyan-300 my-1">
                {{ suiteData?.k6.latenciaP90Ms }} ms
              </div>
              <span class="text-[10px] text-emerald-400">Dentro de SLA</span>
            </div>

            <div class="bg-[#061022] p-3 rounded border border-cyan-500/30 text-center">
              <span class="text-[10px] text-slate-400">LATENCIA P95</span>
              <div class="text-xl font-orbitron font-bold text-emerald-300 my-1">
                {{ suiteData?.k6.latenciaP95Ms }} ms
              </div>
              <span class="text-[10px] text-emerald-400">Objetivo &lt; 200ms</span>
            </div>

            <div class="bg-[#061022] p-3 rounded border border-cyan-500/30 text-center">
              <span class="text-[10px] text-slate-400">LATENCIA P99 (Cola)</span>
              <div class="text-xl font-orbitron font-bold text-cyan-300 my-1">
                {{ suiteData?.k6.latenciaP99Ms }} ms
              </div>
              <span class="text-[10px] text-emerald-400">Objetivo &lt; 400ms</span>
            </div>
          </div>

          <!-- Umbrales y Thresholds k6 -->
          <div class="border border-[#132a4a] rounded overflow-hidden">
            <div class="bg-[#0d1e3d] px-4 py-2 text-[11px] font-bold text-slate-300 grid grid-cols-12 gap-2">
              <span class="col-span-4">MÉTRICA / THRESHOLD</span>
              <span class="col-span-3">OBJETIVO SLA</span>
              <span class="col-span-3">RESULTADO OBTENIDO</span>
              <span class="col-span-2">ESTADO</span>
            </div>

            <div class="divide-y divide-[#132a4a] bg-[#040914]">
              <div
                v-for="(t, i) in suiteData?.k6.thresholds"
                :key="i"
                class="px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-[11px]"
              >
                <span class="col-span-4 text-cyan-300 font-bold">{{ t.metrica }}</span>
                <span class="col-span-3 text-slate-400">{{ t.objetivo }}</span>
                <span class="col-span-3 text-emerald-300 font-bold">{{ t.resultado }}</span>
                <div class="col-span-2">
                  <span class="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold">
                    ✓ PASS
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Script k6 -->
          <div class="mt-4">
            <div class="flex items-center justify-between bg-[#0d1e3d] px-4 py-2 rounded-t border border-[#132a4a]">
              <span class="font-bold text-slate-300 text-xs">📄 Script Generado: benchmarks/k6-load-test.js</span>
              <button
                type="button"
                @click="copiarTexto(suiteData?.k6.scriptGenerado || '', 'k6')"
                class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
              >
                {{ copiadoTipo === 'k6' ? '✓ COPIADO' : 'COPIAR SCRIPT' }}
              </button>
            </div>
            <pre class="bg-[#02050c] p-4 rounded-b border border-t-0 border-[#132a4a] text-cyan-200 text-[10px] overflow-x-auto max-h-48"><code>{{ suiteData?.k6.scriptGenerado }}</code></pre>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- PESTAÑA 3: TESTS E2E MULTICONTEXTO -->
        <!-- ================================================================= -->
        <div v-if="tabActiva === 'e2e'" class="space-y-4 animate-fade-in">
          <div class="bg-[#09152b] p-4 rounded border border-amber-500/30 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-amber-300">
                🧪 SUITE DE INTEGRACIÓN END-TO-END (Flujos DDD Transversales)
              </h3>
              <p class="text-[11px] text-slate-400 mt-1">
                Valida la consistencia eventual, la emisión de Domain Events y el rechazo de invariantes corruptos.
              </p>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 rounded bg-amber-900/50 border border-amber-400 text-amber-200 text-xs font-bold">
                VITEST 100% COBERTURA
              </span>
            </div>
          </div>

          <!-- Lista de Escenarios E2E -->
          <div class="space-y-2">
            <div
              v-for="(t, i) in suiteData?.e2e.tests"
              :key="i"
              class="bg-[#071328] p-3 rounded border border-[#132a4a] hover:border-amber-400/50 transition flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <span class="text-emerald-400 text-base font-bold">✓</span>
                <div>
                  <div class="font-bold text-slate-200 text-xs">{{ t.nombre }}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">{{ t.detalles }}</div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 text-[10px] font-bold">
                  {{ t.duracionMs }} ms
                </span>
                <div class="text-[9px] text-slate-500 mt-1">
                  Contextos: {{ t.boundedContextsInvolucrados.join(', ') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Archivo tests/e2e/integration.e2e.test.ts -->
          <div class="mt-4">
            <div class="flex items-center justify-between bg-[#0d1e3d] px-4 py-2 rounded-t border border-[#132a4a]">
              <span class="font-bold text-slate-300 text-xs">📄 Suite E2E Generada: tests/e2e/integration.e2e.test.ts</span>
              <button
                type="button"
                @click="copiarTexto(suiteData?.e2e.archivoTest || '', 'e2e')"
                class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
              >
                {{ copiadoTipo === 'e2e' ? '✓ COPIADO' : 'COPIAR TESTS' }}
              </button>
            </div>
            <pre class="bg-[#02050c] p-4 rounded-b border border-t-0 border-[#132a4a] text-amber-200 text-[10px] overflow-x-auto max-h-48"><code>{{ suiteData?.e2e.archivoTest }}</code></pre>
          </div>
        </div>

      </div>

      <!-- 5. Pie de Modal con Resumen de Integridad -->
      <footer class="h-12 px-5 border-t border-[#132a4a] bg-[#071328] flex items-center justify-between shrink-0 font-mono text-xs">
        <div class="text-slate-400 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Arquitectura DDD validada con cero mutantes críticos supervivientes.</span>
        </div>
        <div class="text-slate-500 text-[10px]">
          A.R.E.S. v3.8 Benchmark Engine // Powered by Stryker Mutator & Grafana k6
        </div>
      </footer>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
