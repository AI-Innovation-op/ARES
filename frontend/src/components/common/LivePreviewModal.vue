<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { previewCompilerService } from '../../services/preview-compiler.service.js';
import type { ArchivoProyecto } from '../../services/zip.service.js';

const props = defineProps<{
  archivos: ArchivoProyecto[];
  nombreProyecto?: string;
}>();

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

type Dispositivo = 'desktop' | 'tablet' | 'mobile';
const dispositivo = ref<Dispositivo>('desktop');
const logs = ref<{ type: string; message: string; time: string }[]>([]);
const mostrarLogs = ref(false);
const recargando = ref(false);
const versionRender = ref(0);
const iframeRef = ref<HTMLIFrameElement | null>(null);

const anchoContenedor = computed(() => {
  switch (dispositivo.value) {
    case 'mobile':
      return 'w-[375px] h-[667px] shadow-2xl rounded-3xl border-4 border-slate-700';
    case 'tablet':
      return 'w-[768px] h-[800px] shadow-2xl rounded-2xl border-4 border-slate-700';
    case 'desktop':
    default:
      return 'w-full h-full rounded-lg border border-[#132a4a]';
  }
});

const srcdocCompilado = computed(() => {
  // Disparar reactividad al recargar
  versionRender.value;
  return previewCompilerService.compilarProyectoParaPreview(
    props.archivos,
    props.nombreProyecto || 'A.R.E.S. Live Sandbox'
  );
});

function recargar() {
  recargando.value = true;
  logs.value = [];
  versionRender.value++;
  setTimeout(() => {
    recargando.value = false;
  }, 300);
}

function handleMensajeVentana(event: MessageEvent) {
  // Solo aceptar mensajes que vengan de ESTE iframe (el sandbox tiene origen opaco, no se puede comparar event.origin)
  if (event.source !== iframeRef.value?.contentWindow) return;
  if (event.data?.type === 'ARES_SANDBOX_LOG' && Array.isArray(event.data.logs)) {
    logs.value = event.data.logs;
  }
}

onMounted(() => {
  window.addEventListener('message', handleMensajeVentana);
});

onUnmounted(() => {
  window.removeEventListener('message', handleMensajeVentana);
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 font-mono select-none">
    <!-- Contenedor Principal del Modal -->
    <div class="bg-[#071329] border border-cyan-500/60 rounded-xl w-full h-[92vh] max-w-6xl flex flex-col shadow-[0_15px_50px_rgba(0,0,0,0.95)] overflow-hidden">
      <!-- Barra Superior Táctica -->
      <div class="p-3 border-b border-[#132a4a] bg-[#091326] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <!-- Título -->
        <div class="flex items-center gap-2 text-xs sm:text-sm">
          <span class="text-emerald-400 text-base">▶️</span>
          <span class="font-orbitron font-bold text-slate-100 tracking-wider">
            LIVE PREVIEW SANDBOX //
          </span>
          <span class="text-cyan-300 font-bold truncate max-w-[200px]">
            {{ nombreProyecto || 'A.R.E.S. UI' }}
          </span>
        </div>

        <!-- Selector de Dispositivo Responsive -->
        <div class="flex items-center gap-1 bg-[#040914] p-1 rounded-lg border border-[#132a4a] text-xs">
          <button
            type="button"
            @click="dispositivo = 'desktop'"
            class="px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
            :class="dispositivo === 'desktop' ? 'bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/50 font-bold' : 'text-slate-400 hover:text-slate-200'"
            title="Vista de Escritorio (100%)"
          >
            <span>🖥️</span>
            <span class="hidden sm:inline">Desktop</span>
          </button>

          <button
            type="button"
            @click="dispositivo = 'tablet'"
            class="px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
            :class="dispositivo === 'tablet' ? 'bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/50 font-bold' : 'text-slate-400 hover:text-slate-200'"
            title="Vista de Tablet (768px)"
          >
            <span>📟</span>
            <span class="hidden sm:inline">Tablet</span>
          </button>

          <button
            type="button"
            @click="dispositivo = 'mobile'"
            class="px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
            :class="dispositivo === 'mobile' ? 'bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/50 font-bold' : 'text-slate-400 hover:text-slate-200'"
            title="Vista Móvil (375px)"
          >
            <span>📱</span>
            <span class="hidden sm:inline">Móvil</span>
          </button>
        </div>

        <!-- Acciones: Recargar, Logs y Cerrar -->
        <div class="flex items-center gap-2 text-xs">
          <button
            type="button"
            @click="recargar"
            class="p-1.5 px-2.5 rounded border border-[#132a4a] bg-[#040914] hover:border-cyan-400 text-cyan-300 transition cursor-pointer flex items-center gap-1"
            title="Recargar Sandbox"
          >
            <span :class="recargando ? 'animate-spin' : ''">🔄</span>
            <span class="hidden sm:inline">Recargar</span>
          </button>

          <button
            type="button"
            @click="mostrarLogs = !mostrarLogs"
            class="p-1.5 px-2.5 rounded border border-[#132a4a] bg-[#040914] hover:border-emerald-400 text-emerald-300 transition cursor-pointer flex items-center gap-1"
          >
            <span>📜</span>
            <span class="hidden sm:inline">Logs</span>
            <span v-if="logs.length > 0" class="px-1 py-0.2 rounded-full bg-emerald-950 text-[10px] text-emerald-400 font-bold border border-emerald-500/40">
              {{ logs.length }}
            </span>
          </button>

          <button
            type="button"
            @click="emit('cerrar')"
            class="p-1.5 px-3 rounded border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition cursor-pointer font-bold"
            title="Cerrar Live Sandbox"
          >
            ✕ CERRAR
          </button>
        </div>
      </div>

      <!-- Área de Visualización del Sandbox (Viewport) -->
      <div class="flex-1 bg-[#040914] p-3 flex items-center justify-center overflow-auto relative">
        <div :class="['transition-all duration-300 overflow-hidden bg-white relative flex flex-col', anchoContenedor]">
          <iframe
            ref="iframeRef"
            :srcdoc="srcdocCompilado"
            sandbox="allow-scripts allow-forms allow-modals"
            class="w-full h-full border-none bg-white"
          ></iframe>
        </div>
      </div>

      <!-- Panel Inferior de Consola / Logs del Sandbox (Desplegable) -->
      <div v-if="mostrarLogs" class="h-36 border-t border-[#132a4a] bg-[#040914] flex flex-col shrink-0">
        <div class="px-3 py-1.5 bg-[#091326] border-b border-[#132a4a] flex items-center justify-between text-[11px] text-slate-400">
          <span class="font-bold text-cyan-300 flex items-center gap-1">
            <span>💻</span> CONSOLA DEL SANDBOX ({{ logs.length }} EVENTOS)
          </span>
          <button @click="logs = []" class="hover:text-white cursor-pointer">Limpiar Logs</button>
        </div>
        <div class="flex-1 p-2 overflow-y-auto space-y-1 font-mono text-[11px]">
          <div v-if="logs.length === 0" class="text-slate-600 italic py-2 text-center">
            No se han emitido eventos en console.log aún.
          </div>
          <div
            v-for="(log, idx) in logs"
            :key="idx"
            class="flex items-start gap-2"
            :class="[
              log.type === 'error' ? 'text-rose-400' : log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'
            ]"
          >
            <span class="text-slate-600 shrink-0">[{{ log.time }}]</span>
            <span class="font-bold uppercase text-[9px] px-1 rounded border" :class="log.type === 'error' ? 'border-rose-500 bg-rose-950/50' : 'border-slate-700 bg-slate-900'">
              {{ log.type }}
            </span>
            <span class="truncate flex-1">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
