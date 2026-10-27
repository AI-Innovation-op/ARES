<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { apiService } from '../../services/api.service.js';
import { useFsmStore } from '../../stores/fsm.store.js';
import { useUiStore } from '../../stores/ui.store.js';
import MetricsCards from '../hud/MetricsCards.vue';
import DiffViewer from '../common/DiffViewer.vue';
import type { Metricas } from '../../types/ares.types.js';

const fsm = useFsmStore();
const uiStore = useUiStore();

// Sub-pestañas: Auditoría & Refactor vs Test Forge
const subPestana = ref<'audit' | 'testforge'>('audit');

// Sincronizar derivación automática desde el chat
watch(
  () => uiStore.codeBuffer,
  (nuevo) => {
    if (nuevo) {
      codigo.value = nuevo.codigo;
      if (nuevo.lenguaje) lenguaje.value = nuevo.lenguaje;
    }
  },
  { immediate: true }
);

// Historial persistente SQLite
const auditoriasPrevias = ref<any[]>([]);
const mostrarHistorialAuditorias = ref(false);

async function cargarAuditorias() {
  try {
    const list = await apiService.listarAuditorias('default');
    auditoriasPrevias.value = list || [];
  } catch (err) {
    console.warn('⚠️ [CodeSword] No se pudo cargar auditorías:', err);
  }
}

onMounted(() => {
  cargarAuditorias();
});

// Estado: Auditoría
const lenguaje = ref('TypeScript');
const codigo = ref('');
const analisis = ref('');
const codigoRefactorizado = ref('');
const metricas = ref<Metricas | null>(null);
const cargando = ref(false);

// Estado: Test Forge
const frameworkTest = ref('vitest');
const codigoTestInput = ref('');
const codigoTestsGenerados = ref('');
const resumenTests = ref('');
const cargandoTests = ref(false);
const copiadoTests = ref(false);

const lenguajes = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'SQL'];
const frameworks = [
  { id: 'vitest', label: 'Vitest (TS / Vite / Vue)' },
  { id: 'jest', label: 'Jest (JS / Node / React)' },
  { id: 'pytest', label: 'PyTest (Python)' },
  { id: 'gotest', label: 'Go Testing (Go)' },
];

async function ejecutarAuditoria() {
  if (!codigo.value.trim()) return;

  cargando.value = true;
  fsm.cambiarPostura('SLASH', 11);

  try {
    const res = await apiService.auditarCodigo({
      language: lenguaje.value,
      code: codigo.value.trim(),
    });

    analisis.value = res.analysis;
    codigoRefactorizado.value = res.refactoredCode;
    metricas.value = res.metrics;
    fsm.cambiarPostura('VICTORY', 16);
    await cargarAuditorias();
  } catch (err: any) {
    console.error(err);
    fsm.cambiarPostura('ERROR', 2);
    analisis.value = `⚠️ Error en combate de auditoría: ${err.message}`;
  } finally {
    cargando.value = false;
  }
}

function cargarAuditoriaPrevia(item: any) {
  codigoRefactorizado.value = item.refactored_code;
  analisis.value = `### Auditoría recuperada de SQLite (${item.file_path})\n- Complejidad: ${item.original_complexity || 'N/D'} -> ${item.optimized_complexity || 'N/D'}\n- SOLID: ${item.solid_score_before || 'N/D'} -> ${item.solid_score_after || 'N/D'}`;
  metricas.value = {
    bigO_antes: item.original_complexity || 'N/D',
    bigO_despues: item.optimized_complexity || 'N/D',
    solid_antes: item.solid_score_before || 0,
    solid_despues: item.solid_score_after || 0,
    seguridad_antes: item.security_before || 'N/D',
    seguridad_despues: item.security_after || 'BLINDADA',
  };
  mostrarHistorialAuditorias.value = false;
}

function transferirATestForge() {
  codigoTestInput.value = codigoRefactorizado.value || codigo.value;
  subPestana.value = 'testforge';
}

async function forjarPruebas() {
  if (!codigoTestInput.value.trim()) return;

  cargandoTests.value = true;
  fsm.cambiarPostura('SLASH', 12); // Pose 12: Guardia Post-Corte (Verificación con tests)

  try {
    const res = await apiService.generarPruebas({
      code: codigoTestInput.value.trim(),
      language: lenguaje.value,
      framework: frameworkTest.value,
    });

    codigoTestsGenerados.value = res.testCode;
    resumenTests.value = res.summary;
    fsm.cambiarPostura('VICTORY', 4); // Pose 4: Build Exitoso / Tests en verde
  } catch (err: any) {
    console.error(err);
    fsm.cambiarPostura('ERROR', 2);
    resumenTests.value = `⚠️ Error al forjar suite de pruebas: ${err.message}`;
  } finally {
    cargandoTests.value = false;
  }
}

function copiarSuiteTests() {
  if (!codigoTestsGenerados.value) return;
  navigator.clipboard.writeText(codigoTestsGenerados.value);
  copiadoTests.value = true;
  setTimeout(() => {
    copiadoTests.value = false;
  }, 2000);
}

function descargarArchivoTest() {
  if (!codigoTestsGenerados.value) return;
  const extension = frameworkTest.value === 'pytest' ? '.py' : frameworkTest.value === 'gotest' ? '_test.go' : '.spec.ts';
  const nombreArchivo = `ares_combat_test${extension}`;

  const blob = new Blob([codigoTestsGenerados.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-y-auto space-y-4">
    <!-- Encabezado de la Espada Binaria con Sub-Pestañas -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#132a4a] gap-2">
      <div>
        <h2 class="font-orbitron font-bold text-base text-slate-100 flex items-center gap-2">
          <span>⚔️</span> ESPADA BINARIA // AUDITORÍA & CALIDAD INDUSTRIAL
        </h2>
        <p class="text-xs font-mono text-slate-400">
          Refactorización SOLID, reducción de complejidad Big-O y suite de pruebas unitarias.
        </p>
      </div>

      <!-- Selector de Sub-Módulo -->
      <div class="flex items-center gap-2">
        <div class="flex rounded-lg border border-[#132a4a] p-0.5 bg-[#040914] text-xs font-mono">
          <button
            type="button"
            @click="subPestana = 'audit'"
            :class="[
              'px-3 py-1 rounded transition-colors cursor-pointer',
              subPestana === 'audit'
                ? 'bg-[#00ffaa]/20 border border-[#00ffaa]/50 text-[#00ffaa] font-bold'
                : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            ⚔️ AUDITORÍA & REFACTOR
          </button>
          <button
            type="button"
            @click="subPestana = 'testforge'"
            :class="[
              'px-3 py-1 rounded transition-colors cursor-pointer',
              subPestana === 'testforge'
                ? 'bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            🧪 TEST FORGE
          </button>
        </div>

        <!-- Selector de Lenguaje -->
        <select
          v-model="lenguaje"
          class="bg-[#040914] border border-[#132a4a] text-cyan-300 font-mono text-xs rounded px-2.5 py-1.5 outline-none"
        >
          <option v-for="l in lenguajes" :key="l" :value="l">{{ l }}</option>
        </select>

        <!-- Botón Historial SQLite -->
        <button
          @click="mostrarHistorialAuditorias = !mostrarHistorialAuditorias"
          class="px-2.5 py-1 text-xs font-mono rounded border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 cursor-pointer flex items-center gap-1 transition"
          title="Ver registro de auditorías guardadas en SQLite"
        >
          <span>📜</span>
          <span>Combates ({{ auditoriasPrevias.length }})</span>
        </button>
      </div>
    </div>

    <!-- Modal / Drawer de Auditorías Guardadas en SQLite -->
    <div
      v-if="mostrarHistorialAuditorias"
      class="bg-[#091326] border border-rose-500/50 rounded-lg p-3 font-mono text-xs space-y-2 shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-[#132a4a] pb-2">
        <span class="font-bold text-rose-400">💾 REGISTRO DE COMBATES Y AUDITORÍAS (SQLITE):</span>
        <button @click="mostrarHistorialAuditorias = false" class="text-slate-400 hover:text-white">✕</button>
      </div>

      <div v-if="auditoriasPrevias.length === 0" class="text-slate-500 py-2 text-center">
        No hay registros de combate guardados aún en SQLite.
      </div>

      <div class="max-h-52 overflow-y-auto space-y-1 pr-1">
        <div
          v-for="a in auditoriasPrevias"
          :key="a.id"
          @click="cargarAuditoriaPrevia(a)"
          class="flex items-center justify-between p-2 rounded bg-[#040914] border border-[#132a4a] hover:border-rose-400 cursor-pointer transition text-slate-300 hover:text-rose-200"
        >
          <div class="truncate pr-2">
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-[#091326] border border-rose-800 text-rose-300 font-bold mr-2">
              {{ a.file_path }}
            </span>
            <span class="text-xs text-slate-300">
              Big-O: {{ a.original_complexity || '?' }} ➔ {{ a.optimized_complexity || '?' }} | SOLID: {{ a.solid_score_after || '?' }}/100
            </span>
          </div>
          <span class="text-[10px] text-slate-500 shrink-0">
            {{ new Date(a.audited_at).toLocaleDateString('es-PE') }}
          </span>
        </div>
      </div>
    </div>

    <!-- ====================================================================== -->
    <!-- SUB-MÓDULO 1: AUDITORÍA & REFACTOR (ESPADA BINARIA) -->
    <!-- ====================================================================== -->
    <div v-if="subPestana === 'audit'" class="space-y-4">
      <!-- Entrada de Código -->
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-mono text-slate-400 mb-1">CÓDIGO A AUDITAR Y OPTIMIZAR:</label>
          <textarea
            v-model="codigo"
            rows="6"
            placeholder="Pega aquí la función lenta, el endpoint con consultas N+1 o el módulo a auditar..."
            class="w-full bg-[#040914] border border-[#132a4a] focus:border-[#00ffaa] rounded p-2.5 text-xs font-mono text-emerald-300 outline-none resize-y"
          ></textarea>
        </div>

        <button
          @click="ejecutarAuditoria"
          :disabled="cargando || !codigo.trim()"
          class="w-full py-2.5 rounded font-orbitron text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          :class="
            cargando
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-[#00ffaa] hover:bg-[#00e699] text-[#040914] shadow glow-neon'
          "
        >
          <span v-if="cargando" class="animate-spin">⏳</span>
          <span v-else>⚔️</span>
          <span>{{ cargando ? 'ANALIZANDO Y CORTANDO BUGS CON ESPADA...' : 'EJECUTAR CORTE BINARIO DE REFACTOR' }}</span>
        </button>
      </div>

      <!-- Tarjetas de Métricas Algorítmicas -->
      <MetricsCards :metrics="metricas" />

      <!-- Visor de Diffs Comparativo (Antes vs Después) -->
      <div v-if="codigoRefactorizado" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono text-cyan-300 font-bold">COMPARATIVA VISUAL (DIFF):</span>
          <button
            type="button"
            @click="transferirATestForge"
            class="px-2.5 py-1 rounded border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-mono cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <span>🧪</span>
            <span>FORJAR PRUEBAS PARA ESTE REFACTOR →</span>
          </button>
        </div>
        <DiffViewer
          :old-code="codigo"
          :new-code="codigoRefactorizado"
          :language="lenguaje"
        />
      </div>

      <!-- Informe de Auditoría -->
      <div v-if="analisis" class="pt-2 border-t border-[#132a4a] space-y-2">
        <h3 class="text-xs font-mono text-cyan-300 font-bold">DIAGNÓSTICO TÁCTICO DETALLADO:</h3>
        <div class="bg-[#040914] border border-[#132a4a] rounded p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto select-text">
          {{ analisis }}
        </div>
      </div>
    </div>

    <!-- ====================================================================== -->
    <!-- SUB-MÓDULO 2: TEST FORGE TÁCTICO (GENERADOR DE PRUEBAS UNITARIAS) -->
    <!-- ====================================================================== -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between p-3 bg-[#091326] rounded-lg border border-[#132a4a]">
        <div>
          <span class="text-xs font-mono text-cyan-300 font-bold">FRAMEWORK DE PRUEBAS DESTINO:</span>
          <p class="text-[11px] font-mono text-slate-400">
            A.R.E.S. generará casos de éxito, casos borde y mocks de aislamiento.
          </p>
        </div>

        <select
          v-model="frameworkTest"
          class="bg-[#040914] border border-[#132a4a] text-[#00ffaa] font-mono text-xs rounded px-3 py-1.5 outline-none"
        >
          <option v-for="fw in frameworks" :key="fw.id" :value="fw.id">{{ fw.label }}</option>
        </select>
      </div>

      <!-- Entrada de Código a Probar -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-mono text-slate-400">CÓDIGO FUENTE O FUNCIÓN A TESTEAR:</label>
          <button
            v-if="codigoRefactorizado && codigoTestInput !== codigoRefactorizado"
            type="button"
            @click="codigoTestInput = codigoRefactorizado"
            class="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            ← Cargar código del último refactor
          </button>
        </div>
        <textarea
          v-model="codigoTestInput"
          rows="6"
          placeholder="Pega aquí la clase, servicio o función que deseas blindar con pruebas unitarias..."
          class="w-full bg-[#040914] border border-[#132a4a] focus:border-cyan-400 rounded p-2.5 text-xs font-mono text-cyan-200 outline-none resize-y"
        ></textarea>

        <button
          @click="forjarPruebas"
          :disabled="cargandoTests || !codigoTestInput.trim()"
          class="w-full py-2.5 rounded font-orbitron text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          :class="
            cargandoTests
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-[#040914] shadow glow-blue'
          "
        >
          <span v-if="cargandoTests" class="animate-spin">⏳</span>
          <span v-else>🧪</span>
          <span>{{ cargandoTests ? 'FORJANDO SUITE DE PRUEBAS TÁCTICAS...' : 'FORJAR SUITE DE PRUEBAS UNITARIAS' }}</span>
        </button>
      </div>

      <!-- Salida de Pruebas Generadas -->
      <div v-if="codigoTestsGenerados" class="pt-3 border-t border-[#132a4a] space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-mono text-[#00ffaa] font-bold flex items-center gap-2">
            <span>🛡️</span> SUITE LISTA PARA EJECUTAR ({{ frameworkTest.toUpperCase() }}):
          </h3>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="copiarSuiteTests"
              class="px-2.5 py-1 text-xs font-mono rounded border border-[#132a4a] bg-[#040914] hover:border-cyan-400 text-cyan-300 cursor-pointer transition-colors"
            >
              {{ copiadoTests ? '✓ COPIADO' : 'COPIAR TESTS' }}
            </button>
            <button
              type="button"
              @click="descargarArchivoTest"
              class="px-2.5 py-1 text-xs font-mono rounded border border-[#00ffaa]/50 bg-[#00ffaa]/10 hover:bg-[#00ffaa]/20 text-[#00ffaa] cursor-pointer transition-colors"
            >
              DESCARGAR ARCHIVO
            </button>
          </div>
        </div>

        <div class="bg-[#040914] border border-[#132a4a] rounded p-3 font-mono text-xs text-emerald-300 whitespace-pre overflow-x-auto max-h-[450px] select-text">
          <code>{{ codigoTestsGenerados }}</code>
        </div>

        <div v-if="resumenTests" class="p-3 bg-[#091326] border border-[#132a4a] rounded text-xs font-mono text-slate-300">
          <span class="text-cyan-300 font-bold block mb-1">📋 RESUMEN DE COBERTURA:</span>
          {{ resumenTests }}
        </div>
      </div>
    </div>
  </div>
</template>
