<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import MermaidViewer from '../common/MermaidViewer.vue';
import { API_BASE_ORIGIN } from '../../services/http.js';

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'insertarEnChat', prompt: string): void;
}>();

const urlRepo = ref('');
const auditando = ref(false);
const errorMensaje = ref<string | null>(null);
const resultadoAuditoria = ref<any | null>(null);
const pasoActual = ref('');

const repositoriosSugeridos = [
  { nombre: 'Vue 3 Core', url: 'https://github.com/vuejs/core' },
  { nombre: 'Express.js', url: 'https://github.com/expressjs/express' },
  { nombre: 'FastAPI', url: 'https://github.com/tiangolo/fastapi' },
];

async function ejecutarAuditoria(urlAUsar?: string) {
  const urlFinal = (urlAUsar || urlRepo.value).trim();
  if (!urlFinal) {
    errorMensaje.value = 'Por favor ingresa una URL de repositorio válida (ej: https://github.com/owner/repo)';
    return;
  }

  urlRepo.value = urlFinal;
  errorMensaje.value = null;
  auditando.value = true;
  resultadoAuditoria.value = null;

  pasoActual.value = '🔍 Conectando con GitHub API y extrayendo árbol de archivos...';

  try {
    const res = await axios.post(`${API_BASE_ORIGIN}/api/audit/github`, { url: urlFinal });
    resultadoAuditoria.value = res.data;
  } catch (err: any) {
    console.error('Error al auditar repositorio GitHub:', err);
    errorMensaje.value =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'No se pudo completar la auditoría del repositorio.';
  } finally {
    auditando.value = false;
  }
}

function descargarInforme() {
  if (!resultadoAuditoria.value) return;
  const blob = new Blob([resultadoAuditoria.value.informeMarkdown], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const nombre = resultadoAuditoria.value.metadatos?.nombre || 'repo';
  a.download = `Auditoria_ARES_${nombre}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function discutirEnChat() {
  if (!resultadoAuditoria.value) return;
  const prompt = `A.R.E.S., he analizado el repositorio ${resultadoAuditoria.value.metadatos?.url}. Por favor evalúa los puntos más críticos de la auditoría y propón el primer paso del plan de blindaje táctico.`;
  emit('insertarEnChat', prompt);
  emit('cerrar');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 font-mono select-none">
    <div class="bg-[#071329] border border-cyan-500/60 rounded-xl w-full h-[92vh] max-w-5xl flex flex-col shadow-[0_15px_50px_rgba(0,0,0,0.95)] overflow-hidden">
      <!-- Barra Superior Táctica -->
      <div class="p-3.5 border-b border-[#132a4a] bg-[#091326] flex items-center justify-between gap-2 shrink-0">
        <div class="flex items-center gap-2 text-xs sm:text-sm">
          <span class="text-lg">🔍</span>
          <span class="font-orbitron font-bold text-slate-100 tracking-wider">
            INGESTA & AUDITORÍA DE REPOSITORIOS GITHUB //
          </span>
          <span class="text-[#00ffaa] font-bold text-xs">v2.9</span>
        </div>
        <button
          type="button"
          @click="emit('cerrar')"
          class="p-1.5 px-3 rounded border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition cursor-pointer text-xs font-bold"
        >
          ✕ CERRAR
        </button>
      </div>

      <!-- Contenido Principal -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Entrada de URL del Repositorio -->
        <div class="bg-[#040914] p-4 rounded-lg border border-[#132a4a]">
          <label class="block text-xs font-bold text-cyan-300 mb-1.5">
            URL PÚBLICA DE GITHUB (HTTPS):
          </label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              v-model="urlRepo"
              type="text"
              placeholder="https://github.com/usuario/repositorio"
              :disabled="auditando"
              @keydown.enter="ejecutarAuditoria()"
              class="flex-1 bg-[#091326] border border-[#132a4a] focus:border-[#00ffaa] rounded px-3 py-2 text-xs text-slate-200 outline-none"
            />
            <button
              type="button"
              @click="ejecutarAuditoria()"
              :disabled="auditando"
              class="px-4 py-2 rounded bg-[#00ffaa] hover:bg-[#00e699] text-[#040914] font-orbitron font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-[0_0_12px_rgba(0,255,170,0.35)]"
              :class="auditando ? 'opacity-50 cursor-not-allowed' : ''"
            >
              <span v-if="auditando" class="animate-spin">⏳</span>
              <span v-else>⚔️</span>
              <span>{{ auditando ? 'AUDITANDO...' : 'AUDITAR REPO' }}</span>
            </button>
          </div>

          <!-- Sugerencias de Repositorios -->
          <div class="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
            <span>Ejemplos rápidos:</span>
            <button
              v-for="(sug, idx) in repositoriosSugeridos"
              :key="idx"
              type="button"
              @click="ejecutarAuditoria(sug.url)"
              :disabled="auditando"
              class="px-2 py-0.5 rounded bg-[#091326] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 transition cursor-pointer"
            >
              {{ sug.nombre }}
            </button>
          </div>
        </div>

        <!-- Indicador de Carga y Escaneo Táctico -->
        <div v-if="auditando" class="p-8 text-center bg-[#040914] rounded-lg border border-[#00ffaa]/40 space-y-3">
          <div class="w-12 h-12 mx-auto rounded-full border-2 border-[#00ffaa] border-t-transparent animate-spin"></div>
          <div class="font-orbitron font-bold text-[#00ffaa] text-sm tracking-wider">
            A.R.E.S. ESCANEANDO REPOSITORIO
          </div>
          <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {{ pasoActual }}
          </p>
        </div>

        <!-- Error -->
        <div v-if="errorMensaje" class="p-3 bg-rose-950/40 border border-rose-500/60 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ errorMensaje }}</span>
        </div>

        <!-- Resultados de la Auditoría -->
        <div v-if="resultadoAuditoria" class="space-y-4">
          <!-- Tarjeta de Metadatos del Repositorio -->
          <div class="p-3.5 bg-[#040914] border border-[#00ffaa]/50 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="font-orbitron font-bold text-slate-100 text-base flex items-center gap-2">
                <span>📦 {{ resultadoAuditoria.metadatos?.nombre }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300">
                  {{ resultadoAuditoria.metadatos?.lenguaje }}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Propietario: {{ resultadoAuditoria.metadatos?.propietario }} | {{ resultadoAuditoria.metadatos?.totalArchivos }} archivos analizados
              </p>
            </div>

            <div class="flex items-center gap-2 text-xs">
              <span class="px-2.5 py-1 rounded bg-[#091326] border border-[#132a4a] text-amber-400">
                ⭐ {{ resultadoAuditoria.metadatos?.stars }} Stars
              </span>
              <span class="px-2.5 py-1 rounded bg-[#091326] border border-[#132a4a] text-cyan-300">
                🍴 {{ resultadoAuditoria.metadatos?.forks }} Forks
              </span>
            </div>
          </div>

          <!-- Acciones del Reporte -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="descargarInforme"
              class="px-3 py-1.5 rounded bg-[#0b1b36] border border-[#00ffaa] hover:bg-[#00ffaa]/15 text-[#00ffaa] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <span>⬇️</span>
              <span>Descargar Reporte (.MD)</span>
            </button>
            <button
              type="button"
              @click="discutirEnChat"
              class="px-3 py-1.5 rounded bg-[#0b1b36] border border-cyan-400 hover:bg-cyan-950/40 text-cyan-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <span>💬</span>
              <span>Discutir en Consola con A.R.E.S.</span>
            </button>
          </div>

          <!-- Diagrama Mermaid C4 si fue detectado -->
          <div v-if="resultadoAuditoria.diagramaMermaid" class="p-3 bg-[#040914] rounded-lg border border-[#132a4a]">
            <div class="text-xs font-orbitron font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
              <span>🏛️</span>
              <span>DIAGRAMA DE ARQUITECTURA DETECTADO (C4 CONTAINER/SYSTEM)</span>
            </div>
            <MermaidViewer :code="resultadoAuditoria.diagramaMermaid" />
          </div>

          <!-- Informe Completo en Markdown -->
          <div class="p-4 bg-[#040914] rounded-lg border border-[#132a4a] select-text">
            <div class="text-xs font-orbitron font-bold text-[#00ffaa] mb-2 flex items-center gap-1.5">
              <span>📋</span>
              <span>INFORME DE AUDITORÍA INDUSTRIAL Y BLINDAJE OWASP</span>
            </div>
            <pre class="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-200 leading-relaxed">{{ resultadoAuditoria.informeMarkdown }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
