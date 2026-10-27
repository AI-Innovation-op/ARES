<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MensajeChat } from '../../types/ares.types.js';
import MermaidViewer from '../common/MermaidViewer.vue';
import ProjectZipForge from '../common/ProjectZipForge.vue';
import LivePreviewModal from '../common/LivePreviewModal.vue';
import { zipService, type ArchivoProyecto } from '../../services/zip.service.js';
import { previewCompilerService } from '../../services/preview-compiler.service.js';


const props = defineProps<{
  message: MensajeChat;
}>();

const esUsuario = computed(() => props.message.role === 'user');

// Detección de archivos estructurados para la Forja de Proyectos .ZIP
const archivosProyecto = computed<ArchivoProyecto[]>(() => {
  if (esUsuario.value || !props.message.content) return [];
  return zipService.extraerArchivosDeTexto(props.message.content);
});

const nombreSugeridoProyecto = computed(() => {
  const c = props.message.content.toLowerCase();
  if (c.includes('café') || c.includes('cafe')) return 'cafe-shop-ddd';
  if (c.includes('ensalada') || c.includes('salad')) return 'salad-bar-ddd';
  const matchTitulo = props.message.content.match(/^#+\s*(.+)$/m);
  if (matchTitulo) {
    return (
      matchTitulo[1]
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'proyecto-ares'
    );
  }
  return 'proyecto-ares';
});

function descargarProyectoZipDirecto() {
  if (archivosProyecto.value.length === 0) return;
  zipService.descargarProyectoZip(archivosProyecto.value, `${nombreSugeridoProyecto.value}.zip`, true);
}

// Detección táctica para Live Preview Sandbox (v2.8)
const archivosParaPreview = computed<ArchivoProyecto[]>(() => {
  if (archivosProyecto.value.length > 0) {
    return archivosProyecto.value;
  }
  const c = props.message.content;
  if (!c) return [];
  // Fallback para bloques HTML o Vue completos sin convención de archivo
  const matchHtml =
    c.match(/```(?:html|xml)?\s*\n([\s\S]*?(?:<!DOCTYPE|<html|<head|<body)[\s\S]*?)```/i) ||
    c.match(/```html\s*\n([\s\S]*?)```/i);
  if (matchHtml) {
    return [{ ruta: 'index.html', contenido: matchHtml[1].trim(), lenguaje: 'html' }];
  }
  const matchVue = c.match(/```(?:vue)?\s*\n([\s\S]*?<template[\s\S]*?)```/i);
  if (matchVue) {
    return [{ ruta: 'src/App.vue', contenido: matchVue[1].trim(), lenguaje: 'vue' }];
  }
  return [];
});

const tieneVistaPreviaVisual = computed(() => {
  if (esUsuario.value || !props.message.content) return false;
  const c = props.message.content.toLowerCase();
  const esAppVisual =
    c.includes('ensalada') ||
    c.includes('salad') ||
    c.includes('café') ||
    c.includes('cafe') ||
    c.includes('tienda') ||
    c.includes('app web') ||
    c.includes('página web') ||
    c.includes('vue') ||
    c.includes('html');

  if (esAppVisual) return true;

  return (
    archivosParaPreview.value.length > 0 &&
    archivosParaPreview.value.some(
      (a) =>
        a.ruta.endsWith('.html') ||
        a.ruta.endsWith('.vue') ||
        a.contenido.includes('<!DOCTYPE') ||
        a.contenido.includes('<html') ||
        a.contenido.includes('<template>')
    )
  );
});

const modalPreviewAbierto = ref(false);
const mostrarPreviewInline = ref(
  props.message.content.toLowerCase().includes('vista previa') ||
  props.message.content.toLowerCase().includes('tienda de café') ||
  props.message.content.toLowerCase().includes('café') ||
  props.message.content.toLowerCase().includes('ensalada') ||
  props.message.content.toLowerCase().includes('salad') ||
  props.message.content.toLowerCase().includes('live preview')
);
const versionMiniRender = ref(0);

function recargarMiniPreview() {
  versionMiniRender.value++;
}

const srcdocCompilado = computed(() => {
  if (!tieneVistaPreviaVisual.value) return '';
  versionMiniRender.value;
  return previewCompilerService.compilarProyectoParaPreview(
    archivosParaPreview.value,
    nombreSugeridoProyecto.value
  );
});

// Detección automática de artefactos para derivación táctica
const esDocumentacion = computed(() => {
  const c = props.message.content.toLowerCase();
  return (
    c.includes('# rfc') ||
    c.includes('# readme') ||
    c.includes('## adr') ||
    c.includes('openapi: 3') ||
    c.includes('arquitectura') ||
    c.includes('domain-driven') ||
    (c.includes('contexto') && c.includes('decisión'))
  );
});

const esCodigo = computed(() => {
  const c = props.message.content;
  return /```(typescript|javascript|python|go|rust|java|sql)\n/i.test(c) || c.includes('Big-O') || c.includes('SOLID');
});

const esMermaid = computed(() => {
  return /```mermaid/i.test(props.message.content);
});

// Detección de Misión Multi-Agente del Enjambre (v3.1)
const esMisionEnjambre = computed(() => {
  if (esUsuario.value || !props.message.content) return false;
  const c = props.message.content;
  return (
    c.includes('ENJAMBRE TÁCTICO') ||
    c.includes('PROTOCOLO MULTI-AGENTE') ||
    (c.includes('Atenea') && c.includes('Vulcano') && c.includes('Mercurio'))
  );
});

const docCopiado = ref(false);
function copiarDoc() {
  navigator.clipboard.writeText(props.message.content);
  docCopiado.value = true;
  setTimeout(() => {
    docCopiado.value = false;
  }, 2000);
}

function descargarDocMD() {
  const blob = new Blob([props.message.content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const matchTitulo = props.message.content.match(/^#+\s*(.+)$/m);
  const nombre = matchTitulo
    ? matchTitulo[1].toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-')
    : 'documento-ares';
  a.download = `${nombre}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

const codigoCopiado = ref(false);
function copiarCodigoBloque() {
  const match = props.message.content.match(/```([a-z0-9_-]*)\n([\s\S]*?)```/i);
  const code = match ? match[2].trim() : props.message.content;
  navigator.clipboard.writeText(code);
  codigoCopiado.value = true;
  setTimeout(() => {
    codigoCopiado.value = false;
  }, 2000);
}

interface SegmentoMensaje {
  tipo: 'html' | 'mermaid';
  contenido: string;
}

function renderizarMarkdownBasico(txt: string): string {
  // Escapar HTML peligroso
  let res = txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bloques de código normales ```lenguaje ... ```
  res = res.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (_match, lang, code) => {
    return `<div class="my-2 rounded bg-[#040914] border border-[#132a4a] overflow-x-auto p-3 font-mono text-xs text-emerald-300">
      <div class="text-[10px] text-slate-500 uppercase pb-1 border-b border-[#132a4a] mb-2 font-bold">${lang || 'CÓDIGO'}</div>
      <pre><code>${code.trim()}</code></pre>
    </div>`;
  });

  // Código inline `código`
  res = res.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-[#040914] text-[#00ffaa] font-mono text-xs border border-[#132a4a]">$1</code>');

  // Títulos
  res = res.replace(/^### (.*$)/gim, '<h3 class="text-sm font-orbitron font-bold text-cyan-300 mt-2 mb-1">$1</h3>');
  res = res.replace(/^## (.*$)/gim, '<h2 class="text-base font-orbitron font-bold text-[#00ffaa] mt-3 mb-1">$1</h2>');
  res = res.replace(/^# (.*$)/gim, '<h1 class="text-lg font-orbitron font-bold text-slate-100 mt-3 mb-2">$1</h1>');

  // Negrita
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-100">$1</strong>');

  // Listas
  res = res.replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-slate-300">$1</li>');

  // Saltos de línea
  res = res.replace(/\n/g, '<br/>');

  return res;
}

const segmentos = computed<SegmentoMensaje[]>(() => {
  const txt = props.message.content;
  const lista: SegmentoMensaje[] = [];

  // Buscar vallas de código mermaid: ```mermaid ... ```
  const regexMermaid = /```mermaid\s*\n([\s\S]*?)```/gi;
  let ultimoIndice = 0;
  let match: RegExpExecArray | null;

  while ((match = regexMermaid.exec(txt)) !== null) {
    const inicio = match.index;
    const final = regexMermaid.lastIndex;

    // Segmento previo de texto
    if (inicio > ultimoIndice) {
      const parteTexto = txt.slice(ultimoIndice, inicio);
      lista.push({
        tipo: 'html',
        contenido: renderizarMarkdownBasico(parteTexto),
      });
    }

    // Segmento Mermaid
    lista.push({
      tipo: 'mermaid',
      contenido: match[1]?.trim() ?? '',
    });

    ultimoIndice = final;
  }

  // Resto del texto posterior
  if (ultimoIndice < txt.length) {
    const restante = txt.slice(ultimoIndice);
    lista.push({
      tipo: 'html',
      contenido: renderizarMarkdownBasico(restante),
    });
  }

  return lista;
});
</script>

<template>
  <div :class="['flex gap-3 py-3 select-text', esUsuario ? 'justify-end' : 'justify-start']">
    <!-- Avatar Icon (solo para A.R.E.S.) -->
    <div
      v-if="!esUsuario"
      class="w-8 h-8 rounded-full border border-[#00ffaa]/50 bg-[#091326] flex items-center justify-center shrink-0 text-sm shadow glow-neon"
    >
      🛡️
    </div>

    <!-- Burbuja del Mensaje -->
    <div
      :class="[
        'max-w-[85%] rounded-lg p-4 font-sans text-xs sm:text-sm leading-relaxed border',
        esUsuario
          ? 'bg-[#0284c7]/20 border-[#0284c7] text-slate-100 shadow'
          : 'bg-[#091326] border-[#132a4a] text-slate-200 shadow-md',
      ]"
    >
      <!-- Encabezado de Turno de A.R.E.S. -->
      <div v-if="!esUsuario" class="flex items-center justify-between pb-2 mb-2 border-b border-[#132a4a] text-xs font-mono text-slate-400">
        <span class="font-orbitron font-bold text-[#00ffaa]">A.R.E.S. TACTICAL</span>
        <span v-if="message.poseNumber" class="text-cyan-400">
          [POSE-{{ message.poseNumber }}]
        </span>
      </div>

      <!-- Banner Visual de Misión del Enjambre (v3.1) -->
      <div
        v-if="esMisionEnjambre"
        class="mb-3 p-3 rounded-lg border border-purple-500/50 bg-[#0c081c]/90 shadow-[0_0_15px_rgba(168,85,247,0.2)] font-mono text-xs"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 font-bold font-orbitron text-purple-300">
            <span class="animate-bounce">🐝</span>
            <span>ENJAMBRE TÁCTICO MULTI-AGENTE SOBERANO (v3.1)</span>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
            CONSENSO 100% ALCANZADO
          </span>
        </div>

        <!-- Píldoras de los 4 Subagentes -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
          <div class="p-1.5 rounded bg-[#130d29] border border-purple-500/30 flex items-center gap-1.5 text-purple-300">
            <span>🏛️</span>
            <div>
              <div class="font-bold">Atenea</div>
              <div class="text-[9px] text-slate-400">Arquitectura & DDD</div>
            </div>
          </div>
          <div class="p-1.5 rounded bg-[#09152b] border border-cyan-500/30 flex items-center gap-1.5 text-cyan-300">
            <span>⚔️</span>
            <div>
              <div class="font-bold">Vulcano</div>
              <div class="text-[9px] text-slate-400">Backend Clean</div>
            </div>
          </div>
          <div class="p-1.5 rounded bg-[#041d14] border border-[#00ffaa]/30 flex items-center gap-1.5 text-[#00ffaa]">
            <span>🎨</span>
            <div>
              <div class="font-bold">Mercurio</div>
              <div class="text-[9px] text-slate-400">Vue 3 / Live UI</div>
            </div>
          </div>
          <div class="p-1.5 rounded bg-[#1e1405] border border-amber-500/30 flex items-center gap-1.5 text-amber-300">
            <span>🧪</span>
            <div>
              <div class="font-bold">Némesis</div>
              <div class="text-[9px] text-slate-400">QA & Auditoría</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Segmentos de Contenido: HTML y Diagramas Mermaid Interactivos -->
      <div class="prose-content space-y-1">
        <template v-for="(seg, idx) in segmentos" :key="idx">
          <div v-if="seg.tipo === 'html'" v-html="seg.contenido"></div>
          <MermaidViewer v-else-if="seg.tipo === 'mermaid'" :code="seg.contenido" />
        </template>
        <!-- Indicador de procesamiento mientras razona el modelo -->
        <div v-if="!message.content" class="flex items-center gap-2 text-cyan-400 py-1 text-xs font-mono animate-pulse">
          <span class="w-2 h-2 rounded-full bg-[#00ffaa] animate-ping"></span>
          <span>A.R.E.S. procesando respuesta táctica...</span>
        </div>
      </div>

      <!-- Banner de Vista Previa Visual en Vivo (v2.8) -->
      <div
        v-if="!esUsuario && tieneVistaPreviaVisual"
        class="my-3 p-3 rounded-lg border border-[#00ffaa]/50 bg-[#071329] shadow-[0_0_15px_rgba(0,255,170,0.15)] flex flex-wrap items-center justify-between gap-2 font-mono"
      >
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🎨</span>
          <div>
            <div class="font-orbitron font-bold text-[#00ffaa] text-xs sm:text-sm flex items-center gap-2">
              <span>VISTA PREVIA VISUAL INTERACTIVA</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold">
                EN VIVO
              </span>
            </div>
            <p class="text-[11px] text-slate-300">
              La interfaz gráfica ha sido compilada. Puedes verla aquí o en el sandbox responsivo.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="mostrarPreviewInline = !mostrarPreviewInline"
            class="px-2.5 py-1.5 rounded border border-cyan-500/50 bg-[#040914] hover:bg-cyan-950/40 text-cyan-300 hover:text-cyan-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
          >
            <span>{{ mostrarPreviewInline ? '▲' : '👁️' }}</span>
            <span>{{ mostrarPreviewInline ? 'OCULTAR MINI VIEWPORT' : 'VER EN CHAT' }}</span>
          </button>

          <button
            type="button"
            @click="modalPreviewAbierto = true"
            class="px-3 py-1.5 rounded border border-[#00ffaa] bg-[#00ffaa]/20 hover:bg-[#00ffaa]/30 text-[#00ffaa] text-xs font-orbitron font-bold transition shadow-[0_0_10px_rgba(0,255,170,0.3)] cursor-pointer flex items-center gap-1.5"
            title="Abrir sandbox táctico en ventana completa (Desktop, Tablet, Móvil)"
          >
            <span>▶️</span>
            <span>ABRIR SANDBOX</span>
          </button>
        </div>
      </div>

      <!-- Mini Viewport Interactivo Renderizado en el Mensaje -->
      <div
        v-if="!esUsuario && tieneVistaPreviaVisual && mostrarPreviewInline"
        class="my-3 rounded-lg border border-cyan-500/60 overflow-hidden bg-white shadow-2xl transition-all"
      >
        <div class="bg-[#091326] px-3 py-1.5 border-b border-[#132a4a] flex items-center justify-between text-xs font-mono">
          <span class="text-[#00ffaa] font-bold flex items-center gap-1.5">
            <span>🌐</span> INTERFAZ WEB RENDERIZADA
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="recargarMiniPreview"
              class="text-slate-400 hover:text-cyan-300 text-[11px] cursor-pointer"
              title="Recargar mini preview"
            >
              🔄 Recargar
            </button>
            <button
              type="button"
              @click="modalPreviewAbierto = true"
              class="text-cyan-300 hover:text-white font-bold cursor-pointer text-[11px] flex items-center gap-1"
            >
              <span>Abrir Sandbox Completo</span>
              <span>↗</span>
            </button>
          </div>
        </div>
        <iframe
          :key="versionMiniRender"
          :srcdoc="srcdocCompilado"
          sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
          class="w-full h-80 border-none bg-white"
        ></iframe>
      </div>

      <!-- Forja de Proyecto .ZIP Interactivo (v2.7) -->
      <ProjectZipForge
        v-if="!esUsuario && archivosProyecto.length > 0"
        :archivos="archivosProyecto"
        :nombreProyecto="nombreSugeridoProyecto"
      />

      <!-- Derivación Táctica Automática de Artefactos -->
      <div v-if="!esUsuario && message.content && (esDocumentacion || esCodigo || esMermaid || archivosProyecto.length > 0 || tieneVistaPreviaVisual)" class="mt-3 pt-2.5 border-t border-[#132a4a] flex flex-wrap items-center gap-2">
        <span class="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <span>⚡</span> Acciones:
        </span>

        <!-- Botón de Vista Previa en Vivo -->
        <button
          v-if="tieneVistaPreviaVisual"
          type="button"
          @click="modalPreviewAbierto = true"
          class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#00ffaa] hover:bg-[#00ffaa]/20 text-[#00ffaa] text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_8px_rgba(0,255,170,0.3)]"
          title="Abrir vista previa interactiva en vivo en sandbox multi-dispositivo"
        >
          <span>▶️</span>
          <span>Vista Previa en Vivo</span>
        </button>

        <!-- Botón de Descarga .ZIP Rápida -->
        <button
          v-if="archivosProyecto.length > 0"
          @click="descargarProyectoZipDirecto"
          class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#00ffaa]/60 hover:border-[#00ffaa] hover:bg-[#00ffaa]/15 text-[#00ffaa] text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_8px_rgba(0,255,170,0.25)]"
          title="Descargar todos los archivos generados en un archivo .ZIP listo para correr"
        >
          <span>📦</span>
          <span>Descargar .ZIP ({{ archivosProyecto.length }})</span>
        </button>

        <!-- Acciones directas de Documentación -->
        <button
          v-if="esDocumentacion"
          type="button"
          @click="descargarDocMD"
          class="px-2.5 py-1 rounded bg-[#0b1b36] border border-cyan-500/60 hover:border-cyan-400 hover:bg-cyan-950/40 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shadow"
          title="Descargar el documento técnico en formato Markdown (.md)"
        >
          <span>🛡️</span>
          <span>Descargar .MD</span>
        </button>

        <button
          v-if="esDocumentacion"
          type="button"
          @click="copiarDoc"
          class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-cyan-400 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-200 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shadow"
        >
          <span>📋</span>
          <span>{{ docCopiado ? '✓ Copiado' : 'Copiar Doc' }}</span>
        </button>

        <!-- Acciones directas de Código -->
        <button
          v-if="esCodigo && archivosProyecto.length === 0"
          type="button"
          @click="copiarCodigoBloque"
          class="px-2.5 py-1 rounded bg-[#0b1b36] border border-emerald-500/60 hover:border-emerald-400 hover:bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shadow"
          title="Copiar código fuente al portapapeles"
        >
          <span>⚔️</span>
          <span>{{ codigoCopiado ? '✓ Código Copiado' : 'Copiar Código' }}</span>
        </button>
      </div>

      <!-- Fuentes de Grounding (Google Search) -->
      <div v-if="message.sources && message.sources.length > 0" class="mt-3 pt-2 border-t border-[#132a4a] text-xs font-mono">
        <div class="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
          <span>🔍</span> FUENTES DE GROUNDING VERIFICADAS:
        </div>
        <div class="flex flex-wrap gap-1.5">
          <a
            v-for="(source, idx) in message.sources.slice(0, 5)"
            :key="idx"
            :href="source.uri"
            target="_blank"
            rel="noopener noreferrer"
            class="px-2 py-0.5 rounded bg-[#040914] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-[11px] truncate max-w-[220px] transition-colors"
          >
            {{ source.title || source.uri }}
          </a>
        </div>
      </div>

      <!-- Modal de Vista Previa Interactiva en Vivo (Sandbox) -->
      <LivePreviewModal
        v-if="modalPreviewAbierto"
        :archivos="archivosParaPreview"
        :nombreProyecto="nombreSugeridoProyecto"
        @cerrar="modalPreviewAbierto = false"
      />
    </div>
  </div>
</template>
