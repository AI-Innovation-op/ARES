<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiService } from '../../services/api.service.js';
import { useFsmStore } from '../../stores/fsm.store.js';
import type { TipoDocumento } from '../../types/ares.types.js';

const fsm = useFsmStore();

const tipoDoc = ref<TipoDocumento>('README');
const titulo = ref('');
const contexto = ref('');
const resultadoMarkdown = ref('');
const cargando = ref(false);
const copiado = ref(false);

// Bóveda persistente SQLite
const documentosGuardados = ref<any[]>([]);
const mostrarBoveda = ref(false);

const tipos = [
  { valor: 'README', label: 'README.md Maestro' },
  { valor: 'ADR', label: 'ADR (Decisión de Arquitectura)' },
  { valor: 'OPENAPI', label: 'Contrato OpenAPI 3.1 (YAML)' },
  { valor: 'RFC', label: 'RFC Técnico' },
  { valor: 'MERMAID_C4', label: 'Diagrama Mermaid C4' },
  { valor: 'DOCSTRINGS', label: 'Docstrings (TSDoc/JSDoc)' },
];

async function cargarBoveda() {
  try {
    const docs = await apiService.listarDocumentos('default');
    documentosGuardados.value = docs || [];
  } catch (err) {
    console.warn('⚠️ [DocShield] No se pudo cargar documentos de la bóveda:', err);
  }
}

onMounted(() => {
  cargarBoveda();
});

async function forjar() {
  if (!contexto.value.trim()) return;

  cargando.value = true;
  fsm.cambiarPostura('SHIELD', 15);

  try {
    const res = await apiService.forjarDocumento({
      docType: tipoDoc.value,
      sourceContext: contexto.value.trim(),
      title: titulo.value.trim() || undefined,
    });

    resultadoMarkdown.value = res.markdownContent;
    fsm.cambiarPostura('VICTORY', 4);
    await cargarBoveda();
  } catch (err: any) {
    console.error(err);
    fsm.cambiarPostura('ERROR', 2);
    resultadoMarkdown.value = `⚠️ Error al forjar documento: ${err.message}`;
  } finally {
    cargando.value = false;
  }
}

function cargarDocumentoBoveda(doc: any) {
  tipoDoc.value = doc.doc_type;
  titulo.value = doc.title;
  resultadoMarkdown.value = doc.markdown_content;
  mostrarBoveda.value = false;
}

function copiarAlPortapapeles() {
  if (!resultadoMarkdown.value) return;
  navigator.clipboard.writeText(resultadoMarkdown.value);
  copiado.value = true;
  setTimeout(() => {
    copiado.value = false;
  }, 2000);
}

function descargarMD() {
  if (!resultadoMarkdown.value) return;
  const blob = new Blob([resultadoMarkdown.value], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tipoDoc.value.toLowerCase()}_ares.md`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-y-auto space-y-4 relative">
    <!-- Encabezado del Módulo -->
    <div class="flex items-center justify-between pb-3 border-b border-[#132a4a]">
      <div>
        <h2 class="font-orbitron font-bold text-base text-slate-100 flex items-center gap-2">
          <span>🛡️</span> ESCUDO AEGIS // BÓVEDA DOCUMENTAL
        </h2>
        <p class="text-xs font-mono text-slate-400">
          "Un código sin documentación es una fortaleza sin murallas."
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Botón para ver bóveda histórica SQLite -->
        <button
          @click="mostrarBoveda = !mostrarBoveda"
          class="px-2.5 py-1 text-xs font-mono rounded border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 cursor-pointer flex items-center gap-1.5 transition"
        >
          <span>📜</span>
          <span>Bóveda ({{ documentosGuardados.length }})</span>
        </button>

        <button
          v-if="resultadoMarkdown"
          @click="copiarAlPortapapeles"
          class="px-2.5 py-1 text-xs font-mono rounded border border-[#132a4a] bg-[#040914] hover:border-cyan-400 text-cyan-300 cursor-pointer"
        >
          {{ copiado ? '✓ COPIADO' : 'COPIAR' }}
        </button>
        <button
          v-if="resultadoMarkdown"
          @click="descargarMD"
          class="px-2.5 py-1 text-xs font-mono rounded border border-[#00ffaa]/50 bg-[#00ffaa]/10 hover:bg-[#00ffaa]/20 text-[#00ffaa] cursor-pointer"
        >
          DESCARGAR .MD
        </button>
      </div>
    </div>

    <!-- Modal / Drawer de Documentos Guardados en SQLite -->
    <div
      v-if="mostrarBoveda"
      class="bg-[#091326] border border-emerald-500/50 rounded-lg p-3 font-mono text-xs space-y-2 shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-[#132a4a] pb-2">
        <span class="font-bold text-emerald-400">💾 DOCUMENTOS EN BÓVEDA SQLITE:</span>
        <button @click="mostrarBoveda = false" class="text-slate-400 hover:text-white">✕</button>
      </div>

      <div v-if="documentosGuardados.length === 0" class="text-slate-500 py-2 text-center">
        No hay documentos guardados aún en SQLite.
      </div>

      <div class="max-h-52 overflow-y-auto space-y-1 pr-1">
        <div
          v-for="d in documentosGuardados"
          :key="d.id"
          @click="cargarDocumentoBoveda(d)"
          class="flex items-center justify-between p-2 rounded bg-[#040914] border border-[#132a4a] hover:border-emerald-400 cursor-pointer transition text-slate-300 hover:text-emerald-200"
        >
          <div class="truncate pr-2">
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-[#091326] border border-cyan-800 text-cyan-300 font-bold mr-2">
              {{ d.doc_type }}
            </span>
            <span class="text-xs font-semibold">{{ d.title }}</span>
          </div>
          <span class="text-[10px] text-slate-500 shrink-0">
            {{ new Date(d.created_at).toLocaleDateString('es-PE') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Selector de Tipo de Artefacto -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <button
        v-for="t in tipos"
        :key="t.valor"
        type="button"
        @click="tipoDoc = t.valor as TipoDocumento"
        :class="[
          'p-2 rounded text-xs font-mono text-left border transition-all cursor-pointer',
          tipoDoc === t.valor
            ? 'border-[#00ffaa] bg-[#00ffaa]/10 text-[#00ffaa] font-bold shadow'
            : 'border-[#132a4a] bg-[#091326] text-slate-400 hover:text-slate-200 hover:border-slate-700',
        ]"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Campos de Entrada -->
    <div class="space-y-3">
      <div>
        <label class="block text-xs font-mono text-slate-400 mb-1">TÍTULO DEL DOCUMENTO (OPCIONAL):</label>
        <input
          v-model="titulo"
          type="text"
          placeholder="Ej: ADR-001: Adopción de Arquitectura Hexagonal y Colas RabbitMQ"
          class="w-full bg-[#040914] border border-[#132a4a] focus:border-[#00ffaa] rounded p-2 text-xs font-mono text-slate-100 outline-none"
        />
      </div>

      <div>
        <label class="block text-xs font-mono text-slate-400 mb-1">
          CÓDIGO FUENTE O CONTEXTO A DOCUMENTAR:
        </label>
        <textarea
          v-model="contexto"
          rows="6"
          placeholder="Pega aquí el código fuente, la descripción de endpoints o la arquitectura del sistema..."
          class="w-full bg-[#040914] border border-[#132a4a] focus:border-[#00ffaa] rounded p-2.5 text-xs font-mono text-slate-200 outline-none resize-y"
        ></textarea>
      </div>

      <button
        @click="forjar"
        :disabled="cargando || !contexto.trim()"
        class="w-full py-2.5 rounded font-orbitron text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        :class="
          cargando
            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            : 'bg-[#00ffaa] hover:bg-[#00e699] text-[#040914] shadow glow-neon'
        "
      >
        <span v-if="cargando" class="animate-spin">⏳</span>
        <span v-else>🛡️</span>
        <span>{{ cargando ? 'FORJANDO DOCUMENTO CON EL ESCUDO...' : 'FORJAR DOCUMENTO CON ESCUDO AEGIS' }}</span>
      </button>
    </div>

    <!-- Salida del Documento Generado -->
    <div v-if="resultadoMarkdown" class="pt-3 border-t border-[#132a4a] flex-1 flex flex-col">
      <h3 class="text-xs font-mono text-[#00ffaa] font-bold mb-2">ARTEFACTO GENERADO:</h3>
      <div class="flex-1 bg-[#040914] border border-[#132a4a] rounded p-3 overflow-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
        {{ resultadoMarkdown }}
      </div>
    </div>
  </div>
</template>
