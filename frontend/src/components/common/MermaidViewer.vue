<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import mermaid from 'mermaid';

const props = defineProps<{
  code: string;
}>();

const contenedorRef = ref<HTMLDivElement | null>(null);
const svgRenderizado = ref<string>('');
const errorRender = ref<string | null>(null);
const verCodigoCrudo = ref(false);
const escalaZoom = ref(1);

// Configuración visual de Mermaid para la estética cyberpunk de A.R.E.S.
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'strict',
  fontFamily: 'JetBrains Mono, monospace',
  themeVariables: {
    darkMode: true,
    background: '#040914',
    primaryColor: '#091326',
    primaryBorderColor: '#00ffaa',
    primaryTextColor: '#00ffaa',
    secondaryColor: '#0284c7',
    secondaryBorderColor: '#00f2fe',
    secondaryTextColor: '#00f2fe',
    tertiaryColor: '#1e3a8a',
    lineColor: '#00ffaa',
    textColor: '#e2e8f0',
    mainBkg: '#091326',
  },
});

async function renderizarDiagrama() {
  if (!props.code.trim()) return;

  errorRender.value = null;
  const idUnico = `ares-mermaid-${Math.random().toString(36).substring(2, 9)}`;

  try {
    const { svg } = await mermaid.render(idUnico, props.code.trim());
    svgRenderizado.value = svg;
  } catch (err: any) {
    console.warn('⚠️ [Mermaid] Error de sintaxis en diagrama:', err);
    errorRender.value = err.message || 'Error al procesar sintaxis Mermaid';
  }
}

onMounted(() => {
  renderizarDiagrama();
});

watch(() => props.code, () => {
  renderizarDiagrama();
});

function zoomIn() {
  escalaZoom.value = Math.min(escalaZoom.value + 0.2, 2.5);
}

function zoomOut() {
  escalaZoom.value = Math.max(escalaZoom.value - 0.2, 0.5);
}

function resetZoom() {
  escalaZoom.value = 1;
}

function descargarSVG() {
  if (!svgRenderizado.value) return;
  const blob = new Blob([svgRenderizado.value], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diagrama_tactico_ares_${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="my-3 rounded-lg border border-[#132a4a] bg-[#040914] overflow-hidden shadow-lg select-none">
    <!-- Barra de Herramientas del Diagrama -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-[#091326] border-b border-[#132a4a] text-xs font-mono">
      <div class="flex items-center gap-2">
        <span class="text-[#00ffaa] font-bold">📊 DIAGRAMA MERMAID</span>
        <span class="text-[10px] text-slate-500">C4 / SECUENCIA / ARQUITECTURA</span>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- Controles de Zoom -->
        <button
          type="button"
          @click="zoomIn"
          class="px-2 py-0.5 rounded bg-[#040914] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-[11px] cursor-pointer"
          title="Acercar zoom"
        >
          +
        </button>
        <button
          type="button"
          @click="zoomOut"
          class="px-2 py-0.5 rounded bg-[#040914] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-[11px] cursor-pointer"
          title="Alejar zoom"
        >
          -
        </button>
        <button
          type="button"
          @click="resetZoom"
          class="px-2 py-0.5 rounded bg-[#040914] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-[11px] cursor-pointer"
          title="Restablecer tamaño"
        >
          {{ Math.round(escalaZoom * 100) }}%
        </button>

        <!-- Alternar Código Crudo / SVG -->
        <button
          type="button"
          @click="verCodigoCrudo = !verCodigoCrudo"
          class="px-2 py-0.5 rounded bg-[#040914] border border-[#132a4a] hover:border-[#00ffaa] text-emerald-300 text-[11px] cursor-pointer"
        >
          {{ verCodigoCrudo ? 'VER GRÁFICO' : 'VER CÓDIGO' }}
        </button>

        <!-- Descarga SVG -->
        <button
          type="button"
          @click="descargarSVG"
          class="px-2 py-0.5 rounded bg-[#00ffaa]/10 border border-[#00ffaa]/50 hover:bg-[#00ffaa]/20 text-[#00ffaa] text-[11px] cursor-pointer"
          title="Descargar diagrama en formato vectorial SVG"
        >
          SVG
        </button>
      </div>
    </div>

    <!-- Área de Visualización del Diagrama -->
    <div
      ref="contenedorRef"
      class="p-4 overflow-auto max-h-[500px] flex items-center justify-center min-h-[160px] bg-grid-tactical"
    >
      <!-- Error de sintaxis: degradación elegante mostrando código -->
      <div v-if="errorRender" class="text-xs font-mono text-amber-400 p-2">
        <p class="mb-2">⚠️ Sintaxis de diagrama no renderizable automáticamente:</p>
        <pre class="bg-black/50 p-2 rounded text-slate-300 overflow-x-auto">{{ code }}</pre>
      </div>

      <!-- Vista de código crudo -->
      <pre
        v-else-if="verCodigoCrudo"
        class="w-full text-xs font-mono text-emerald-300 whitespace-pre overflow-x-auto p-2"
      ><code>{{ code }}</code></pre>

      <!-- SVG Interactivo Renderizado -->
      <div
        v-else
        class="transition-transform duration-150 origin-center"
        :style="{ transform: `scale(${escalaZoom})` }"
        v-html="svgRenderizado"
      ></div>
    </div>
  </div>
</template>

<style>
/* Estilos aplicados a elementos SVG de Mermaid */
.mermaid svg {
  max-width: 100%;
  height: auto;
}
</style>
