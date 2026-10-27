<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  MemoryFrontendService,
  type ArchitecturalMemory,
  type MemoryCollection,
  type MemoryStats,
} from '../../services/memory.service.js';
import { useChatStore } from '../../stores/chat.store.js';

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const chatStore = useChatStore();

// Pestañas
const tabActiva = ref<'busqueda' | 'nueva' | 'banco'>('busqueda');

// Búsqueda Semántica
const queryBusqueda = ref('');
const umbralSimilitud = ref(0.55);
const coleccionFiltro = ref<string>('todos');
const buscando = ref(false);
const resultados = ref<ArchitecturalMemory[]>([]);
const tiempoBusqueda = ref<number | null>(null);

// Formulario Nueva Memoria
const nuevoTitulo = ref('');
const nuevaColeccion = ref<MemoryCollection>('adr');
const nuevoContenido = ref('');
const nuevosTags = ref('ddd, arquitectura, typescript');
const guardando = ref(false);
const mensajeExito = ref<string | null>(null);

// Banco de Memorias & Stats
const memorias = ref<ArchitecturalMemory[]>([]);
const stats = ref<MemoryStats | null>(null);
const cargandoBanco = ref(false);
const memoriaDetalle = ref<ArchitecturalMemory | null>(null);
const copiadoExitoso = ref(false);

const tagsSugeridos = [
  'hexagonal',
  'ddd',
  'inmutabilidad',
  'sqlite',
  'cicd',
  'owasp',
  'typescript',
  'value-objects',
];

onMounted(async () => {
  await cargarBancoYStats();
  // Búsqueda inicial automática de muestra
  ejecutarBusqueda('arquitectura hexagonal y value objects');
});

async function cargarBancoYStats() {
  cargandoBanco.value = true;
  try {
    stats.value = await MemoryFrontendService.obtenerEstadisticas();
    memorias.value = await MemoryFrontendService.listarMemorias();
    if (memorias.value.length > 0 && !memoriaDetalle.value) {
      memoriaDetalle.value = memorias.value[0];
    }
  } catch (error) {
    console.error('Error cargando memorias:', error);
  } finally {
    cargandoBanco.value = false;
  }
}

async function ejecutarBusqueda(queryCustom?: string) {
  const q = queryCustom !== undefined ? queryCustom : queryBusqueda.value;
  if (!q.trim()) return;

  buscando.value = true;
  queryBusqueda.value = q;
  try {
    const col = coleccionFiltro.value !== 'todos' ? (coleccionFiltro.value as MemoryCollection) : undefined;
    const res = await MemoryFrontendService.buscarSemantica(q, umbralSimilitud.value, 8, col);
    resultados.value = res.resultados;
    tiempoBusqueda.value = res.tiempoBusquedaMs;
  } catch (error) {
    console.error('Error en búsqueda semántica:', error);
  } finally {
    buscando.value = false;
  }
}

async function guardarNuevaMemoria() {
  if (!nuevoTitulo.value.trim() || !nuevoContenido.value.trim()) return;

  guardando.value = true;
  mensajeExito.value = null;
  try {
    const tagsArray = nuevosTags.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    await MemoryFrontendService.guardarMemoria({
      collection: nuevaColeccion.value,
      title: nuevoTitulo.value.trim(),
      content: nuevoContenido.value.trim(),
      tags: tagsArray,
      metadata: { author: 'Comandante', source: 'Oraculo Modal v3.3' },
    });

    mensajeExito.value = '✓ Memoria vectorizada en 128 dimensiones y persistida en SQLite con éxito.';
    nuevoTitulo.value = '';
    nuevoContenido.value = '';
    await cargarBancoYStats();

    setTimeout(() => {
      mensajeExito.value = null;
      tabActiva.value = 'banco';
    }, 1500);
  } catch (error) {
    console.error('Error guardando memoria:', error);
  } finally {
    guardando.value = false;
  }
}

async function eliminarMemoria(id: string) {
  if (!confirm(`¿Confirmas la eliminación de la memoria ${id}?`)) return;
  try {
    await MemoryFrontendService.eliminarMemoria(id);
    await cargarBancoYStats();
    if (memoriaDetalle.value?.id === id) {
      memoriaDetalle.value = memorias.value[0] || null;
    }
  } catch (error) {
    console.error('Error eliminando memoria:', error);
  }
}

function inyectarEnChat(memoria: ArchitecturalMemory) {
  const prompt = `A.R.E.S., consultando el Oráculo de Memoria Arquitectónica, toma como referencia el documento "${memoria.title}" (${memoria.collection.toUpperCase()}):\n\n> ${memoria.content.replace(/\n/g, ' ')}\n\n¿Cómo aplicamos estos principios en el diseño actual?`;
  chatStore.enviarMensaje(prompt);
  emit('cerrar');
}

function copiarTexto(texto: string) {
  navigator.clipboard.writeText(texto);
  copiadoExitoso.value = true;
  setTimeout(() => {
    copiadoExitoso.value = false;
  }, 2000);
}

const colorColeccion = (col: string) => {
  switch (col) {
    case 'adr':
      return 'border-purple-500/50 text-purple-300 bg-purple-950/40';
    case 'code_snippet':
      return 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40';
    case 'security_rule':
      return 'border-amber-500/50 text-amber-300 bg-amber-950/40';
    case 'system_design':
      return 'border-emerald-500/50 text-emerald-300 bg-emerald-950/40';
    default:
      return 'border-slate-500/50 text-slate-300 bg-slate-900/40';
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none">
    <div class="w-full max-w-6xl h-[92vh] bg-[#040914] border border-purple-500/50 rounded-xl flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.22)] overflow-hidden">
      <!-- 1. Encabezado del Oráculo -->
      <header class="px-5 py-3.5 border-b border-[#132a4a] bg-[#091326] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg border border-purple-400/60 bg-[#150d2a] flex items-center justify-center text-xl shadow-inner">
            🧠
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-orbitron font-bold text-sm text-slate-100 tracking-wider">
                ORÁCULO DE MEMORIA SEMÁNTICA VECTORIAL
              </h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/90 border border-purple-400 text-purple-300 font-bold">
                v3.3 VECTOR RAG
              </span>
            </div>
            <p class="text-[11px] font-mono text-slate-400">
              Recuperación de conocimiento arquitectónico con Cosine Similarity y almacenamiento local persistente en SQLite WAL.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Pestañas de Navegación -->
          <div class="flex items-center bg-[#040914] p-1 rounded-lg border border-[#132a4a] text-xs font-mono">
            <button
              @click="tabActiva = 'busqueda'"
              class="px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
              :class="tabActiva === 'busqueda' ? 'bg-purple-600/30 text-purple-200 border border-purple-400/60 font-bold shadow-[0_0_8px_rgba(168,85,247,0.3)]' : 'text-slate-400 hover:text-slate-200'"
            >
              <span>🔍</span>
              <span>Búsqueda Vectorial</span>
            </button>
            <button
              @click="tabActiva = 'nueva'"
              class="px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
              :class="tabActiva === 'nueva' ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-400/60 font-bold shadow-[0_0_8px_rgba(0,229,255,0.3)]' : 'text-slate-400 hover:text-slate-200'"
            >
              <span>💾</span>
              <span>Forjar Memoria</span>
            </button>
            <button
              @click="tabActiva = 'banco'"
              class="px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
              :class="tabActiva === 'banco' ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-400/60 font-bold shadow-[0_0_8px_rgba(0,255,170,0.3)]' : 'text-slate-400 hover:text-slate-200'"
            >
              <span>🏛️</span>
              <span>Banco ({{ memorias.length }})</span>
            </button>
          </div>

          <button
            @click="emit('cerrar')"
            class="w-8 h-8 rounded-lg border border-slate-700 bg-[#0b1b36] hover:border-red-400 hover:text-red-400 text-slate-400 flex items-center justify-center transition cursor-pointer"
            title="Cerrar modal (Esc)"
          >
            ✕
          </button>
        </div>
      </header>

      <!-- 2. Cuerpo Principal -->
      <div class="flex-1 overflow-hidden flex flex-col p-4 bg-[#040914]">
        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <!-- PESTAÑA 1: BÚSQUEDA SEMÁNTICA VECTORIAL -->
        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <div v-if="tabActiva === 'busqueda'" class="h-full flex flex-col gap-3">
          <!-- Barra de Búsqueda y Filtros -->
          <div class="bg-[#091326] border border-[#132a4a] rounded-xl p-3 flex flex-col gap-3 shrink-0">
            <div class="flex items-center gap-2">
              <div class="flex-1 flex items-center bg-[#02050b] border border-[#132a4a] rounded-lg px-3 py-2 text-xs font-mono focus-within:border-purple-400 transition">
                <span class="text-purple-400 mr-2 text-base">🔍</span>
                <input
                  v-model="queryBusqueda"
                  @keyup.enter="ejecutarBusqueda()"
                  type="text"
                  placeholder="Pregunta en lenguaje natural: ej. ¿Cómo estructuramos un Value Object inmutable en DDD?"
                  class="flex-1 bg-transparent text-slate-200 outline-none placeholder-slate-500"
                />
              </div>

              <button
                @click="ejecutarBusqueda()"
                :disabled="buscando"
                class="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-slate-100 font-orbitron font-bold text-xs tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
              >
                <span v-if="buscando" class="animate-spin text-sm">🔄</span>
                <span v-else>⚡</span>
                <span>{{ buscando ? 'CONSULTANDO...' : 'BUSCAR RAG' }}</span>
              </button>
            </div>

            <!-- Controles y Umbral de Similitud -->
            <div class="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <span>UMBRAL DE SIMILITUD:</span>
                  <input
                    v-model.number="umbralSimilitud"
                    type="range"
                    min="0.4"
                    max="0.85"
                    step="0.05"
                    class="accent-purple-400 cursor-pointer w-24"
                  />
                  <span class="font-bold text-purple-300">{{ Math.round(umbralSimilitud * 100) }}%</span>
                </div>

                <div class="flex items-center gap-2">
                  <span>COLECCIÓN:</span>
                  <select
                    v-model="coleccionFiltro"
                    class="bg-[#040914] text-cyan-300 border border-[#132a4a] px-2 py-1 rounded text-xs outline-none cursor-pointer"
                  >
                    <option value="todos">Todas las colecciones</option>
                    <option value="adr">ADRs de Arquitectura</option>
                    <option value="code_snippet">Patrones de Código</option>
                    <option value="security_rule">Reglas OWASP</option>
                    <option value="system_design">System Design</option>
                  </select>
                </div>
              </div>

              <!-- Tags Rápidos -->
              <div class="flex items-center gap-1.5">
                <span class="text-slate-500 hidden sm:inline">Tags:</span>
                <button
                  v-for="tag in tagsSugeridos"
                  :key="tag"
                  @click="ejecutarBusqueda(tag)"
                  class="px-2 py-0.5 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-purple-400 text-purple-300 text-[10px] transition cursor-pointer"
                >
                  #{{ tag }}
                </button>
              </div>
            </div>
          </div>

          <!-- Métricas de Búsqueda -->
          <div class="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>
              Resultados semánticos encontrados: <strong class="text-purple-300">{{ resultados.length }}</strong>
            </span>
            <span v-if="tiempoBusqueda !== null" class="text-cyan-400">
              Latencia vectorial: <strong>{{ tiempoBusqueda }}ms</strong> (SQLite Local)
            </span>
          </div>

          <!-- Cuadrícula de Resultados Rankeados -->
          <div class="flex-1 overflow-y-auto space-y-3 pr-1">
            <div v-if="resultados.length === 0" class="h-64 flex flex-col items-center justify-center text-slate-500 text-xs font-mono gap-2 border border-dashed border-[#132a4a] rounded-xl">
              <span>🧠 No se encontraron memorias que superen el umbral del {{ Math.round(umbralSimilitud * 100) }}%.</span>
              <span class="text-slate-600">Prueba reduciendo el umbral o buscando términos como "DDD", "inmutabilidad", "sqlite" o "owasp".</span>
            </div>

            <div
              v-for="res in resultados"
              :key="res.id"
              class="p-4 rounded-xl bg-[#080f1e] border border-[#132a4a] hover:border-purple-500/60 transition flex flex-col gap-2 relative overflow-hidden group shadow-sm"
            >
              <!-- Barra Superior de la Tarjeta -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border" :class="colorColeccion(res.collection)">
                    {{ res.collection }}
                  </span>
                  <h3 class="font-bold text-sm text-slate-100 group-hover:text-purple-300 transition">
                    {{ res.title }}
                  </h3>
                </div>

                <!-- Match Score Badge -->
                <div class="flex items-center gap-2">
                  <div class="px-2.5 py-1 rounded-full font-mono text-xs font-bold bg-emerald-950/80 border border-emerald-400 text-emerald-300 flex items-center gap-1 shadow-[0_0_8px_rgba(0,255,170,0.3)]">
                    <span>⚡</span>
                    <span>{{ Math.round((res.similarityScore || 0) * 100) }}% MATCH</span>
                  </div>
                </div>
              </div>

              <!-- Contenido de la Memoria -->
              <div class="text-xs font-mono text-slate-300 whitespace-pre-wrap line-clamp-3 bg-[#02050b] p-3 rounded-lg border border-[#132a4a]/80 select-text leading-relaxed">
                {{ res.content }}
              </div>

              <!-- Tags y Acciones -->
              <div class="flex items-center justify-between pt-1">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="t in res.tags"
                    :key="t"
                    class="px-2 py-0.2 rounded text-[10px] font-mono bg-cyan-950/60 border border-cyan-900 text-cyan-300"
                  >
                    #{{ t }}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    @click="copiarTexto(res.content)"
                    class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-xs font-mono transition cursor-pointer"
                  >
                    📋 Copiar
                  </button>
                  <button
                    @click="inyectarEnChat(res)"
                    class="px-2.5 py-1 rounded bg-purple-950/80 border border-purple-500/60 hover:border-purple-400 text-purple-200 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <span>💬</span>
                    <span>Preguntar al Chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <!-- PESTAÑA 2: FORJAR NUEVA MEMORIA ARQUITECTÓNICA -->
        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <div v-else-if="tabActiva === 'nueva'" class="h-full flex flex-col gap-3">
          <div v-if="mensajeExito" class="p-3 bg-emerald-950/60 border border-emerald-400 rounded-lg text-emerald-200 text-xs font-mono flex items-center gap-2 animate-pulse">
            <span>✅</span>
            <span>{{ mensajeExito }}</span>
          </div>

          <div class="flex-1 bg-[#02050b] border border-[#132a4a] rounded-xl p-4 flex flex-col gap-3 overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="md:col-span-2 flex flex-col gap-1">
                <label class="text-xs font-mono text-slate-400">TÍTULO DEL DOCUMENTO / DECISIÓN:</label>
                <input
                  v-model="nuevoTitulo"
                  type="text"
                  placeholder="Ej. ADR-005: Estrategia de Autenticación con JWT Asimétrico Ed25519"
                  class="bg-[#091326] border border-[#132a4a] text-slate-100 px-3 py-2 rounded-lg text-xs font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-mono text-slate-400">COLECCIÓN:</label>
                <select
                  v-model="nuevaColeccion"
                  class="bg-[#091326] border border-[#132a4a] text-cyan-300 px-3 py-2 rounded-lg text-xs font-mono outline-none cursor-pointer"
                >
                  <option value="adr">ADR (Architecture Decision Record)</option>
                  <option value="code_snippet">Snippet / Patrón de Código</option>
                  <option value="security_rule">Regla de Seguridad OWASP</option>
                  <option value="system_design">Diseño de Sistemas (System Design)</option>
                  <option value="openapi">Contrato OpenAPI 3.1</option>
                  <option value="general">Conocimiento General</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-slate-400">TAGS (Separados por coma):</label>
              <input
                v-model="nuevosTags"
                type="text"
                placeholder="ddd, seguridad, jwt, arquitectura, backend"
                class="bg-[#091326] border border-[#132a4a] text-slate-200 px-3 py-2 rounded-lg text-xs font-mono outline-none focus:border-cyan-400"
              />
            </div>

            <div class="flex-1 flex flex-col gap-1 min-h-[220px]">
              <label class="text-xs font-mono text-slate-400">CONTENIDO TÉCNICO EN MARKDOWN:</label>
              <textarea
                v-model="nuevoContenido"
                placeholder="Escribe el contexto, la decisión, código de ejemplo o las consecuencias arquitectónicas..."
                class="flex-1 p-3 bg-[#091326] border border-[#132a4a] text-slate-200 font-mono text-xs rounded-lg outline-none resize-none leading-relaxed focus:border-cyan-400 select-text"
              ></textarea>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-[#132a4a]">
              <span class="text-[11px] font-mono text-slate-500">
                El motor generará automáticamente un vector de 128 dimensiones con hash semántico ponderado L2.
              </span>

              <button
                @click="guardarNuevaMemoria"
                :disabled="guardando"
                class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 font-orbitron font-bold text-xs tracking-wider text-slate-100 transition cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              >
                <span v-if="guardando" class="animate-spin text-sm">🔄</span>
                <span v-else>💾</span>
                <span>{{ guardando ? 'VECTORIZANDO...' : 'GUARDAR Y VECTORIZAR' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <!-- PESTAÑA 3: BANCO DE CONOCIMIENTO & TELEMETRÍA -->
        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <div v-else-if="tabActiva === 'banco'" class="h-full flex flex-col md:flex-row gap-4 overflow-hidden">
          <!-- Columna Izquierda: Lista de Memorias -->
          <div class="w-full md:w-80 flex flex-col bg-[#091326] border border-[#132a4a] rounded-xl overflow-hidden shrink-0">
            <!-- Resumen Estadístico -->
            <div class="p-3 border-b border-[#132a4a] bg-[#080f1e] flex flex-col gap-1 text-xs font-mono">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">TOTAL MEMORIAS:</span>
                <strong class="text-purple-300 font-orbitron">{{ stats?.totalMemorias || memorias.length }}</strong>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-500">DIMENSIÓN VECTORIAL:</span>
                <span class="text-cyan-400">128D (L2 Norm)</span>
              </div>
            </div>

            <!-- Lista de Elementos -->
            <div class="flex-1 overflow-y-auto p-2 space-y-2">
              <div
                v-for="mem in memorias"
                :key="mem.id"
                @click="memoriaDetalle = mem"
                class="p-2.5 rounded-lg border transition cursor-pointer flex flex-col gap-1"
                :class="memoriaDetalle?.id === mem.id ? 'border-purple-400 bg-purple-950/30' : 'border-[#132a4a] bg-[#02050b] hover:border-slate-500'"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase border" :class="colorColeccion(mem.collection)">
                    {{ mem.collection }}
                  </span>
                  <span class="text-[10px] font-mono text-slate-500">{{ new Date(mem.updated_at).toLocaleDateString() }}</span>
                </div>
                <div class="text-xs font-bold text-slate-200 line-clamp-1">{{ mem.title }}</div>
              </div>
            </div>
          </div>

          <!-- Columna Derecha: Detalle de la Memoria Seleccionada -->
          <div class="flex-1 bg-[#02050b] border border-[#132a4a] rounded-xl flex flex-col overflow-hidden shadow-inner">
            <div v-if="memoriaDetalle" class="h-full flex flex-col">
              <div class="px-4 py-2.5 border-b border-[#132a4a] bg-[#080f1e] flex items-center justify-between text-xs font-mono">
                <div class="flex items-center gap-2">
                  <span class="text-purple-400 font-bold">📄 {{ memoriaDetalle.title }}</span>
                  <span class="text-[10px] px-2 py-0.2 rounded border uppercase" :class="colorColeccion(memoriaDetalle.collection)">
                    {{ memoriaDetalle.collection }}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    @click="copiarTexto(memoriaDetalle.content)"
                    class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-xs font-mono transition cursor-pointer"
                  >
                    {{ copiadoExitoso ? '✓ Copiado' : '📋 Copiar' }}
                  </button>
                  <button
                    @click="inyectarEnChat(memoriaDetalle)"
                    class="px-2.5 py-1 rounded bg-purple-950/80 border border-purple-500/60 hover:border-purple-400 text-purple-200 text-xs font-mono font-bold transition cursor-pointer"
                  >
                    💬 Enviar al Chat
                  </button>
                  <button
                    @click="eliminarMemoria(memoriaDetalle.id)"
                    class="px-2.5 py-1 rounded bg-red-950/50 border border-red-500/40 hover:border-red-400 text-red-300 text-xs font-mono transition cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <!-- Visor de Markdown del Detalle -->
              <div class="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                {{ memoriaDetalle.content }}
              </div>

              <!-- Tags Footer -->
              <div class="px-4 py-2 border-t border-[#132a4a] bg-[#080f1e] flex items-center gap-1.5 flex-wrap">
                <span class="text-[11px] font-mono text-slate-500">Palabras Clave Vectorizadas:</span>
                <span
                  v-for="tag in memoriaDetalle.tags"
                  :key="tag"
                  class="px-2 py-0.2 rounded text-[10px] font-mono bg-cyan-950/60 border border-cyan-900 text-cyan-300"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>

            <div v-else class="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
              Selecciona una memoria para visualizar su contenido completo.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
