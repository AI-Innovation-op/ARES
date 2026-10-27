<script setup lang="ts">
import { ref, computed } from 'vue';
import { zipService, type ArchivoProyecto } from '../../services/zip.service.js';
import LivePreviewModal from './LivePreviewModal.vue';

const props = withDefaults(
  defineProps<{
    archivos: ArchivoProyecto[];
    nombreProyecto?: string;
  }>(),
  {
    nombreProyecto: 'proyecto-ares',
  }
);

const expandido = ref(false);
const modalPreviewAbierto = ref(false);
const archivoSeleccionadoIdx = ref(0);
const empaquetando = ref(false);
const descargado = ref(false);
const copiado = ref(false);

const archivoActual = computed(() => {
  return props.archivos[archivoSeleccionadoIdx.value] || props.archivos[0];
});

async function descargarZip() {
  if (empaquetando.value || props.archivos.length === 0) return;

  empaquetando.value = true;
  try {
    const nombreLimpio = props.nombreProyecto
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-');

    await zipService.descargarProyectoZip(props.archivos, `${nombreLimpio}.zip`, true);
    descargado.value = true;
    setTimeout(() => {
      descargado.value = false;
    }, 3000);
  } catch (err) {
    console.error('Error al empaquetar .ZIP:', err);
    alert('Falla al generar el archivo .ZIP');
  } finally {
    empaquetando.value = false;
  }
}

function copiarCodigo() {
  if (!archivoActual.value) return;
  navigator.clipboard.writeText(archivoActual.value.contenido);
  copiado.value = true;
  setTimeout(() => {
    copiado.value = false;
  }, 2000);
}
</script>

<template>
  <div class="my-3 rounded-lg border border-[#00ffaa]/40 bg-[#071329] p-3 shadow-[0_4px_20px_rgba(0,255,170,0.12)] font-mono text-xs">
    <!-- Barra Principal del Bundle -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-base">📦</span>
        <div>
          <div class="font-orbitron font-bold text-slate-100 flex items-center gap-2">
            <span>FORJA DE PROYECTO .ZIP</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-[#00ffaa]/15 border border-[#00ffaa]/50 text-[#00ffaa]">
              {{ archivos.length }} ARCHIVOS DETECTADOS
            </span>
          </div>
          <p class="text-[11px] text-slate-400">
            Arquitectura estructurada lista para empaquetar y ejecutar.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Botón para ver u ocultar el explorador de archivos -->
        <button
          type="button"
          @click="expandido = !expandido"
          class="px-2.5 py-1.5 rounded border border-[#132a4a] bg-[#040914] hover:border-cyan-400 text-cyan-300 transition cursor-pointer flex items-center gap-1.5"
          :title="expandido ? 'Ocultar explorador de archivos' : 'Explorar árbol de archivos'"
        >
          <span>{{ expandido ? '▼' : '▶' }}</span>
          <span>{{ expandido ? 'OCULTAR' : 'EXPLORAR' }}</span>
        </button>

        <!-- Botón Estelar 1: Vista Previa en Vivo (Sandbox) -->
        <button
          type="button"
          @click="modalPreviewAbierto = true"
          class="px-2.5 py-1.5 rounded border border-emerald-500/60 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 transition cursor-pointer flex items-center gap-1.5 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          title="Abrir vista previa interactiva en vivo (Sandbox responsivo)"
        >
          <span>▶️</span>
          <span>VISTA PREVIA</span>
        </button>

        <!-- Botón Estelar: Descargar .ZIP -->
        <button
          type="button"
          @click="descargarZip"
          :disabled="empaquetando"
          class="px-3 py-1.5 rounded font-orbitron font-bold transition shadow cursor-pointer flex items-center gap-2"
          :class="[
            descargado
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
              : 'bg-[#00ffaa] hover:bg-[#00e699] text-[#040914] shadow-[0_0_12px_rgba(0,255,170,0.4)]',
            empaquetando ? 'opacity-50 cursor-not-allowed' : '',
          ]"
        >
          <span v-if="empaquetando" class="animate-spin">⏳</span>
          <span v-else-if="descargado">✓</span>
          <span v-else>⬇️</span>
          <span>
            {{ empaquetando ? 'EMPAQUETANDO...' : descargado ? '¡DESCARGADO!' : 'DESCARGAR .ZIP' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Explorador Interactivo de Archivos (Desplegable) -->
    <div v-if="expandido" class="mt-3 pt-3 border-t border-[#132a4a] grid grid-cols-1 md:grid-cols-3 gap-2">
      <!-- Columna Izquierda: Árbol de Archivos -->
      <div class="md:col-span-1 bg-[#040914] border border-[#132a4a] rounded p-2 max-h-60 overflow-y-auto space-y-1">
        <div class="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-1 pb-1 border-b border-[#132a4a]">
          ESTRUCTURA DE ARCHIVOS:
        </div>
        <button
          v-for="(arch, idx) in archivos"
          :key="idx"
          type="button"
          @click="archivoSeleccionadoIdx = idx"
          class="w-full text-left px-2 py-1.5 rounded text-[11px] truncate transition flex items-center gap-1.5 cursor-pointer"
          :class="[
            archivoSeleccionadoIdx === idx
              ? 'bg-[#00ffaa]/15 text-[#00ffaa] border border-[#00ffaa]/40 font-semibold'
              : 'text-slate-300 hover:bg-[#091326] border border-transparent',
          ]"
        >
          <span class="text-xs">📄</span>
          <span class="truncate">{{ arch.ruta }}</span>
        </button>
      </div>

      <!-- Columna Derecha: Visor de Código -->
      <div v-if="archivoActual" class="md:col-span-2 bg-[#040914] border border-[#132a4a] rounded flex flex-col max-h-60 overflow-hidden">
        <div class="bg-[#091326] px-2.5 py-1 border-b border-[#132a4a] flex items-center justify-between text-[11px]">
          <span class="text-cyan-300 font-semibold truncate">{{ archivoActual.ruta }}</span>
          <button
            type="button"
            @click="copiarCodigo"
            class="text-[10px] text-slate-400 hover:text-[#00ffaa] transition cursor-pointer px-1 py-0.5"
          >
            {{ copiado ? '✓ COPIADO' : 'COPIAR' }}
          </button>
        </div>
        <pre class="p-2.5 overflow-auto text-[11px] font-mono text-emerald-300 flex-1 leading-relaxed select-text"><code>{{ archivoActual.contenido }}</code></pre>
      </div>
    </div>
    <!-- Modal de Vista Previa Interactiva en Vivo (Sandbox) -->
    <LivePreviewModal
      v-if="modalPreviewAbierto"
      :archivos="archivos"
      :nombreProyecto="nombreProyecto"
      @cerrar="modalPreviewAbierto = false"
    />
  </div>
</template>
