<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MensajeChat } from '../../types/ares.types.js';
import MermaidViewer from '../common/MermaidViewer.vue';
import ProjectZipForge from '../common/ProjectZipForge.vue';
import { zipService, type ArchivoProyecto } from '../../services/zip.service.js';


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

      <!-- Forja de Proyecto .ZIP Interactivo (v2.7) -->
      <ProjectZipForge
        v-if="!esUsuario && archivosProyecto.length > 0"
        :archivos="archivosProyecto"
        :nombreProyecto="nombreSugeridoProyecto"
      />

      <!-- Derivación Táctica Automática de Artefactos -->
      <div v-if="!esUsuario && message.content && (esDocumentacion || esCodigo || esMermaid || archivosProyecto.length > 0)" class="mt-3 pt-2.5 border-t border-[#132a4a] flex flex-wrap items-center gap-2">
        <span class="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <span>⚡</span> Acciones:
        </span>

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
    </div>
  </div>
</template>
