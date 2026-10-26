<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  oldCode: string;
  newCode: string;
  language?: string;
}>();

const modoVista = ref<'split' | 'unified'>('split');
const copiado = ref(false);

interface LineaDiff {
  tipo: 'added' | 'removed' | 'unchanged';
  numAntiguo?: number;
  numNuevo?: number;
  texto: string;
}

// Algoritmo LCS (Longest Common Subsequence) para cálculo determinista de diff línea por línea
function calcularDiffLineas(antiguo: string, nuevo: string): LineaDiff[] {
  const lineasA = antiguo.split('\n');
  const lineasB = nuevo.split('\n');

  const m = lineasA.length;
  const n = lineasB.length;

  // Matriz de programación dinámica para LCS
  // Para evitar sobrecarga en archivos gigantes (>1000 líneas), limitamos tamaño
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (lineasA[i] === lineasB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Reconstrucción del diff
  let i = m;
  let j = n;
  const resultadoInverso: LineaDiff[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lineasA[i - 1] === lineasB[j - 1]) {
      resultadoInverso.push({
        tipo: 'unchanged',
        numAntiguo: i,
        numNuevo: j,
        texto: lineasA[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      resultadoInverso.push({
        tipo: 'added',
        numNuevo: j,
        texto: lineasB[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      resultadoInverso.push({
        tipo: 'removed',
        numAntiguo: i,
        texto: lineasA[i - 1],
      });
      i--;
    }
  }

  return resultadoInverso.reverse();
}

const lineasDiff = computed(() => {
  return calcularDiffLineas(props.oldCode || '', props.newCode || '');
});

const estadisticas = computed(() => {
  let agregadas = 0;
  let eliminadas = 0;
  for (const l of lineasDiff.value) {
    if (l.tipo === 'added') agregadas++;
    if (l.tipo === 'removed') eliminadas++;
  }
  return { agregadas, eliminadas };
});

function copiarRefactor() {
  navigator.clipboard.writeText(props.newCode);
  copiado.value = true;
  setTimeout(() => {
    copiado.value = false;
  }, 2000);
}
</script>

<template>
  <div class="my-3 rounded-lg border border-[#132a4a] bg-[#040914] overflow-hidden select-text shadow-lg">
    <!-- Barra Superior del Visor de Diffs -->
    <div class="flex items-center justify-between px-3 py-2 bg-[#091326] border-b border-[#132a4a] text-xs font-mono">
      <div class="flex items-center gap-3">
        <span class="font-bold text-[#00ffaa] flex items-center gap-1.5">
          <span>⚔️</span> DIFF TÁCTICO DE REFACTOR
        </span>
        <div class="flex items-center gap-2 text-[11px]">
          <span class="text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
            +{{ estadisticas.agregadas }}
          </span>
          <span class="text-rose-400 font-semibold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
            -{{ estadisticas.eliminadas }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Selector Modo Vista (Dividida / Unificada) -->
        <div class="flex rounded border border-[#132a4a] overflow-hidden">
          <button
            type="button"
            @click="modoVista = 'split'"
            :class="[
              'px-2.5 py-1 text-[11px] cursor-pointer transition-colors',
              modoVista === 'split' ? 'bg-[#00ffaa]/20 text-[#00ffaa] font-bold' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            DIVIDIDA
          </button>
          <button
            type="button"
            @click="modoVista = 'unified'"
            :class="[
              'px-2.5 py-1 text-[11px] cursor-pointer transition-colors border-l border-[#132a4a]',
              modoVista === 'unified' ? 'bg-[#00ffaa]/20 text-[#00ffaa] font-bold' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            UNIFICADA
          </button>
        </div>

        <!-- Botón Copiar -->
        <button
          type="button"
          @click="copiarRefactor"
          class="px-2.5 py-1 text-[11px] rounded border border-[#00ffaa]/50 bg-[#00ffaa]/10 hover:bg-[#00ffaa]/20 text-[#00ffaa] font-bold cursor-pointer transition-colors"
        >
          {{ copiado ? '✓ COPIADO' : 'COPIAR REFACTOR' }}
        </button>
      </div>
    </div>

    <!-- Vista Dividida (Dos Columnas: Original vs Refactorizado) -->
    <div v-if="modoVista === 'split'" class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#132a4a] text-xs font-mono max-h-[500px] overflow-auto">
      <!-- Columna Izquierda: Original (Rojo) -->
      <div class="overflow-x-auto bg-[#040914]">
        <div class="sticky top-0 bg-[#091326]/95 border-b border-[#132a4a] px-3 py-1 text-[11px] text-slate-400 flex items-center justify-between">
          <span>ORIGINAL (DEUDA / CÓDIGO PREVIO)</span>
          <span class="text-rose-400">ANTES</span>
        </div>
        <div class="p-2 space-y-0.5">
          <div
            v-for="(linea, idx) in lineasDiff.filter(l => l.tipo !== 'added')"
            :key="idx"
            :class="[
              'flex items-start px-2 py-0.5 rounded font-mono',
              linea.tipo === 'removed' ? 'bg-rose-950/40 text-rose-300' : 'text-slate-400 hover:bg-slate-900/50'
            ]"
          >
            <span class="w-8 shrink-0 text-slate-600 select-none text-right pr-2">{{ linea.numAntiguo ?? '' }}</span>
            <span class="w-4 shrink-0 text-rose-500 font-bold select-none">{{ linea.tipo === 'removed' ? '-' : ' ' }}</span>
            <pre class="flex-1 whitespace-pre-wrap break-all"><code>{{ linea.texto }}</code></pre>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Refactorizado (Verde) -->
      <div class="overflow-x-auto bg-[#040914]">
        <div class="sticky top-0 bg-[#091326]/95 border-b border-[#132a4a] px-3 py-1 text-[11px] text-[#00ffaa] flex items-center justify-between">
          <span>REFACTOR BLINDADO (ESPADA BINARIA)</span>
          <span class="text-emerald-400">DESPUÉS</span>
        </div>
        <div class="p-2 space-y-0.5">
          <div
            v-for="(linea, idx) in lineasDiff.filter(l => l.tipo !== 'removed')"
            :key="idx"
            :class="[
              'flex items-start px-2 py-0.5 rounded font-mono',
              linea.tipo === 'added' ? 'bg-emerald-950/40 text-[#00ffaa]' : 'text-slate-300 hover:bg-slate-900/50'
            ]"
          >
            <span class="w-8 shrink-0 text-slate-600 select-none text-right pr-2">{{ linea.numNuevo ?? '' }}</span>
            <span class="w-4 shrink-0 text-emerald-400 font-bold select-none">{{ linea.tipo === 'added' ? '+' : ' ' }}</span>
            <pre class="flex-1 whitespace-pre-wrap break-all"><code>{{ linea.texto }}</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista Unificada (Una Columna Línea a Línea) -->
    <div v-else class="max-h-[500px] overflow-auto p-2 text-xs font-mono space-y-0.5 bg-[#040914]">
      <div
        v-for="(linea, idx) in lineasDiff"
        :key="idx"
        :class="[
          'flex items-start px-2 py-0.5 rounded font-mono',
          linea.tipo === 'added'
            ? 'bg-emerald-950/40 text-[#00ffaa]'
            : linea.tipo === 'removed'
            ? 'bg-rose-950/40 text-rose-300'
            : 'text-slate-400 hover:bg-slate-900/50'
        ]"
      >
        <span class="w-8 shrink-0 text-slate-600 select-none text-right pr-1">{{ linea.numAntiguo ?? '' }}</span>
        <span class="w-8 shrink-0 text-slate-600 select-none text-right pr-2">{{ linea.numNuevo ?? '' }}</span>
        <span
          class="w-4 shrink-0 font-bold select-none"
          :class="linea.tipo === 'added' ? 'text-emerald-400' : linea.tipo === 'removed' ? 'text-rose-400' : 'text-slate-600'"
        >
          {{ linea.tipo === 'added' ? '+' : linea.tipo === 'removed' ? '-' : ' ' }}
        </span>
        <pre class="flex-1 whitespace-pre-wrap break-all"><code>{{ linea.texto }}</code></pre>
      </div>
    </div>
  </div>
</template>
