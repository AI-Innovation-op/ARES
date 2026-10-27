<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  ArchitectureFrontendService,
  type SystemTopology,
  type TopologyNode,
} from '../../services/architecture.service.js';
import { useChatStore } from '../../stores/chat.store.js';
import { useUiStore } from '../../stores/ui.store.js';

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const chatStore = useChatStore();
const uiStore = useUiStore();

const topologias = ref<Array<{ id: string; nombre: string; descripcion: string; patronArquitectonico: string }>>([]);
const topologiaSeleccionadaId = ref<string>('ares-sovereign-core');
const topologiaActual = ref<SystemTopology | null>(null);
const nodoSeleccionado = ref<TopologyNode | null>(null);
const cargando = ref(false);
const mensajeAlerta = ref<string | null>(null);

// Modal Mermaid C4
const modalC4Abierto = ref(false);
const codigoMermaidC4 = ref('');
const copiadoExitoso = ref(false);

onMounted(async () => {
  await cargarTopologias();
  await seleccionarTopologia('ares-sovereign-core');
});

async function cargarTopologias() {
  try {
    topologias.value = await ArchitectureFrontendService.listarTopologias();
  } catch (error) {
    console.error('Error cargando lista de topologías:', error);
  }
}

async function seleccionarTopologia(id: string) {
  cargando.value = true;
  topologiaSeleccionadaId.value = id;
  mensajeAlerta.value = null;
  try {
    topologiaActual.value = await ArchitectureFrontendService.obtenerTopologia(id);
    if (topologiaActual.value && topologiaActual.value.nodes.length > 0) {
      nodoSeleccionado.value = topologiaActual.value.nodes[0];
    }
  } catch (error) {
    console.error('Error obteniendo topología:', error);
  } finally {
    cargando.value = false;
  }
}

async function simularTrafico() {
  try {
    const res = await ArchitectureFrontendService.simularTrafico(2.5);
    topologiaActual.value = res.topologia;
    mensajeAlerta.value = `⚡ ${res.mensaje} (Tráfico total escalado a ${res.topologia.metricasGlobales.totalRps} RPS).`;
  } catch (error) {
    console.error('Error simulando tráfico:', error);
  }
}

async function inyectarCaos() {
  try {
    const targetNodeId = nodoSeleccionado.value?.id;
    const res = await ArchitectureFrontendService.inyectarCaos(targetNodeId);
    topologiaActual.value = res.topologia;
    mensajeAlerta.value = res.accion;
  } catch (error) {
    console.error('Error inyectando caos:', error);
  }
}

async function restaurarTopologia() {
  try {
    const res = await ArchitectureFrontendService.restaurar();
    topologiaActual.value = res.topologia;
    mensajeAlerta.value = '✓ ' + res.mensaje;
    setTimeout(() => {
      mensajeAlerta.value = null;
    }, 4000);
  } catch (error) {
    console.error('Error restaurando topología:', error);
  }
}

async function verDiagramaC4() {
  try {
    codigoMermaidC4.value = await ArchitectureFrontendService.exportarMermaidC4(topologiaSeleccionadaId.value);
    modalC4Abierto.value = true;
  } catch (error) {
    console.error('Error exportando C4:', error);
  }
}

function copiarTexto(texto: string) {
  navigator.clipboard.writeText(texto);
  copiadoExitoso.value = true;
  setTimeout(() => {
    copiadoExitoso.value = false;
  }, 2000);
}

function enviarC4AlChat() {
  const prompt = `A.R.E.S., he exportado el siguiente Diagrama C4 Container de la topología "${topologiaActual.value?.nombre}". Por favor audítalo, identifica posibles cuellos de botella y genera un ADR formal:\n\n\`\`\`mermaid\n${codigoMermaidC4.value}\n\`\`\``;
  chatStore.enviarMensaje(prompt);
  modalC4Abierto.value = false;
  emit('cerrar');
}

function saltarAMemoria(adrId?: string) {
  if (!adrId) return;
  emit('cerrar');
  uiStore.modalMemoriaAbierto = true;
}

const colorTipo = (tipo: string) => {
  switch (tipo) {
    case 'client':
      return 'border-cyan-400 text-cyan-300 bg-cyan-950/70';
    case 'service':
      return 'border-[#00ffaa] text-[#00ffaa] bg-emerald-950/70';
    case 'database':
      return 'border-purple-400 text-purple-300 bg-purple-950/70';
    case 'queue':
      return 'border-amber-400 text-amber-300 bg-amber-950/70';
    case 'gateway':
      return 'border-blue-400 text-blue-300 bg-blue-950/70';
    default:
      return 'border-slate-500 text-slate-300 bg-slate-900/70';
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none">
    <div class="w-full max-w-6xl h-[92vh] bg-[#040914] border border-cyan-500/50 rounded-xl flex flex-col shadow-[0_0_40px_rgba(0,229,255,0.2)] overflow-hidden">
      <!-- 1. Encabezado Táctico -->
      <header class="px-5 py-3 border-b border-[#132a4a] bg-[#091326] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg border border-cyan-400/60 bg-[#040914] flex items-center justify-center text-xl shadow-inner">
            🌐
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-orbitron font-bold text-sm text-slate-100 tracking-wider">
                A.R.E.S. RADAR DE ARQUITECTURA C4 & EVENT SPICE
              </h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-bold">
                v3.4 TOPOLOGY RADAR
              </span>
            </div>
            <p class="text-[11px] font-mono text-slate-400">
              Visualizador dinámico de topologías distribuidas, inspección de bounded contexts y simulación de tráfico en vivo.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Selector de Topología -->
          <div class="flex items-center gap-2 bg-[#040914] px-2.5 py-1 rounded-lg border border-[#132a4a] text-xs font-mono">
            <span class="text-slate-500 hidden sm:inline">TOPOLOGÍA:</span>
            <select
              :value="topologiaSeleccionadaId"
              @change="(e: any) => seleccionarTopologia(e.target.value)"
              class="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
            >
              <option v-for="t in topologias" :key="t.id" :value="t.id" class="bg-[#091326] text-slate-200">
                {{ t.nombre }}
              </option>
            </select>
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

      <!-- 2. Barra de Métricas Globales & Alertas -->
      <div class="px-5 py-2.5 border-b border-[#132a4a] bg-[#070e1c] flex flex-wrap items-center justify-between text-xs font-mono gap-3 shrink-0">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500">TRÁFICO TOTAL:</span>
            <span class="font-bold font-orbitron text-cyan-300">{{ topologiaActual?.metricasGlobales.totalRps || 0 }} RPS</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500">LATENCIA P50:</span>
            <span class="font-bold text-emerald-400">{{ topologiaActual?.metricasGlobales.latenciaPromedioMs || 0 }} ms</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500">ERROR RATE:</span>
            <span class="font-bold" :class="topologiaActual?.metricasGlobales.tasaErrorPct === 0 ? 'text-emerald-400' : 'text-amber-400'">
              {{ topologiaActual?.metricasGlobales.tasaErrorPct || 0 }}%
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500">SOLID SCORE:</span>
            <span class="font-bold text-purple-300">{{ topologiaActual?.metricasGlobales.adherenciaSolid || 0 }}/100</span>
          </div>
        </div>

        <!-- Botones de Acción de Caos y Tráfico -->
        <div class="flex items-center gap-2">
          <button
            @click="simularTrafico"
            class="px-2.5 py-1 rounded bg-[#0b1b36] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 font-bold transition cursor-pointer flex items-center gap-1"
            title="Inyectar ráfaga de 2.5x en la tasa de peticiones"
          >
            <span>⚡</span>
            <span>Ráfaga (2.5x)</span>
          </button>
          <button
            @click="inyectarCaos"
            class="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/60 hover:border-amber-400 text-amber-200 font-bold transition cursor-pointer flex items-center gap-1"
            title="Simular saturación de nodo y activación de circuit breakers"
          >
            <span>💥</span>
            <span>Inyectar Caos</span>
          </button>
          <button
            @click="restaurarTopologia"
            class="px-2.5 py-1 rounded bg-[#0b1b36] border border-emerald-500/60 hover:border-emerald-400 text-emerald-300 transition cursor-pointer flex items-center gap-1"
            title="Restaurar parámetros de salud iniciales"
          >
            <span>🔄</span>
            <span>Restaurar</span>
          </button>
          <button
            @click="verDiagramaC4"
            class="px-2.5 py-1 rounded bg-purple-950/60 border border-purple-500/60 hover:border-purple-400 text-purple-200 font-bold transition cursor-pointer flex items-center gap-1"
          >
            <span>📋</span>
            <span>Mermaid C4</span>
          </button>
        </div>
      </div>

      <!-- Banner de Alerta Dinámica -->
      <div v-if="mensajeAlerta" class="px-5 py-2 bg-cyan-950/60 border-b border-cyan-500/50 text-cyan-200 text-xs font-mono flex items-center justify-between animate-pulse">
        <span>{{ mensajeAlerta }}</span>
        <button @click="mensajeAlerta = null" class="text-slate-400 hover:text-white">✕</button>
      </div>

      <!-- 3. Contenedor Principal: Radar SVG Interactivo y Panel de Nodo -->
      <div class="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#02050b]">
        <!-- Lienzo SVG del Radar de Arquitectura -->
        <div class="flex-1 relative overflow-hidden flex items-center justify-center p-4">
          <!-- Fondo de Rejilla Ciberpunk -->
          <div class="absolute inset-0 opacity-15 bg-[radial-gradient(#00ffaa_1px,transparent_1px)] [background-size:24px_24px]"></div>

          <!-- Capa SVG de Conexiones Animadas -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00ffaa" stop-opacity="0.8" />
                <stop offset="100%" stop-color="#0284c7" stop-opacity="0.8" />
              </linearGradient>
            </defs>

            <!-- Aristas / Conexiones entre Nodos -->
            <g v-for="edge in topologiaActual?.edges" :key="edge.id">
              <path
                v-if="topologiaActual"
                :d="`M ${topologiaActual.nodes.find(n => n.id === edge.source)?.x}% ${topologiaActual.nodes.find(n => n.id === edge.source)?.y}% L ${topologiaActual.nodes.find(n => n.id === edge.target)?.x}% ${topologiaActual.nodes.find(n => n.id === edge.target)?.y}%`"
                stroke="url(#edgeGradient)"
                stroke-width="2"
                stroke-dasharray="6,6"
                class="animate-[dash_15s_linear_infinite]"
              />
            </g>
          </svg>

          <!-- Nodos Renderizados como Tarjetas Flotantes -->
          <div class="relative w-full h-full">
            <div
              v-for="node in topologiaActual?.nodes"
              :key="node.id"
              @click="nodoSeleccionado = node"
              class="absolute -translate-x-1/2 -translate-y-1/2 p-3 rounded-xl border backdrop-blur-md transition-all duration-300 cursor-pointer flex flex-col gap-1 w-48 shadow-lg hover:scale-105"
              :style="{ left: `${node.x}%`, top: `${node.y}%` }"
              :class="[
                nodoSeleccionado?.id === node.id ? 'ring-2 ring-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.4)]' : '',
                node.status === 'degraded' ? 'border-amber-400 bg-amber-950/80 animate-pulse' :
                node.status === 'offline' ? 'border-red-500 bg-red-950/80' :
                colorTipo(node.tipo)
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/40">
                  {{ node.tipo }}
                </span>
                <span
                  class="w-2 h-2 rounded-full"
                  :class="node.status === 'healthy' ? 'bg-emerald-400 shadow-[0_0_6px_#00ffaa]' : node.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'"
                ></span>
              </div>

              <div class="font-bold text-xs text-slate-100 line-clamp-1">
                {{ node.nombre }}
              </div>

              <div class="text-[10px] font-mono text-slate-300 line-clamp-1">
                {{ node.tecnologia }}
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] font-mono text-slate-400">
                <span>{{ node.rps }} RPS</span>
                <span :class="node.latenciaMs > 500 ? 'text-amber-300 font-bold' : 'text-emerald-400'">
                  {{ node.latenciaMs }} ms
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel Lateral de Inspección de Nodo Seleccionado -->
        <div class="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#132a4a] bg-[#091326] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div class="flex items-center justify-between border-b border-[#132a4a] pb-2 text-xs font-mono">
            <span class="text-cyan-400 font-bold uppercase tracking-wider">🔬 INSPECTOR DE NODO</span>
            <span class="text-slate-500">{{ nodoSeleccionado?.id }}</span>
          </div>

          <div v-if="nodoSeleccionado" class="flex flex-col gap-3">
            <div>
              <div class="text-base font-bold text-slate-100 font-orbitron">
                {{ nodoSeleccionado.nombre }}
              </div>
              <div class="text-xs font-mono text-cyan-300">
                {{ nodoSeleccionado.tecnologia }}
              </div>
            </div>

            <div class="p-3 bg-[#02050b] border border-[#132a4a] rounded-lg text-xs font-mono space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">BOUNDED CONTEXT:</span>
                <span class="text-purple-300 font-bold">{{ nodoSeleccionado.boundedContext || 'Core' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">CAPA DDD:</span>
                <span class="text-emerald-400 font-bold uppercase">{{ nodoSeleccionado.capaDdd }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">ESTADO OPERATIVO:</span>
                <span
                  class="px-2 py-0.2 rounded text-[10px] font-bold"
                  :class="nodoSeleccionado.status === 'healthy' ? 'bg-emerald-950 text-emerald-300 border border-emerald-400' : 'bg-amber-950 text-amber-300 border border-amber-400'"
                >
                  {{ nodoSeleccionado.status.toUpperCase() }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">LATENCIA:</span>
                <span class="font-bold text-slate-200">{{ nodoSeleccionado.latenciaMs }} ms</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">CARGA EN TIEMPO REAL:</span>
                <span class="font-bold text-cyan-300">{{ nodoSeleccionado.rps }} peticiones/seg</span>
              </div>
            </div>

            <div>
              <div class="text-xs font-mono text-slate-400 mb-1">DESCRIPCIÓN ARQUITECTÓNICA:</div>
              <p class="text-xs font-mono text-slate-300 bg-[#02050b] p-3 rounded-lg border border-[#132a4a] leading-relaxed">
                {{ nodoSeleccionado.descripcion }}
              </p>
            </div>

            <div v-if="nodoSeleccionado.adrVinculado" class="p-3 bg-purple-950/40 border border-purple-500/50 rounded-lg flex items-center justify-between">
              <div>
                <div class="text-[10px] font-mono text-purple-300 uppercase">ADR Vinculado en Memoria:</div>
                <div class="text-xs font-mono font-bold text-slate-200">{{ nodoSeleccionado.adrVinculado }}</div>
              </div>
              <button
                @click="saltarAMemoria(nodoSeleccionado.adrVinculado)"
                class="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-slate-900 font-bold text-xs font-mono transition cursor-pointer"
              >
                Ver ADR ➔
              </button>
            </div>
          </div>

          <div v-else class="text-slate-500 text-xs font-mono italic text-center py-8">
            Haz clic en cualquier nodo del radar para inspeccionar sus contratos y métricas en vivo.
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Código C4 Mermaid -->
    <div v-if="modalC4Abierto" class="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
      <div class="w-full max-w-3xl bg-[#091326] border border-purple-500/50 rounded-xl p-4 flex flex-col gap-3 shadow-2xl">
        <div class="flex items-center justify-between border-b border-[#132a4a] pb-2 text-xs font-mono">
          <span class="text-purple-300 font-bold text-sm">📄 DIAGRAMA C4 CONTAINER (MERMAID)</span>
          <button @click="modalC4Abierto = false" class="text-slate-400 hover:text-white">✕</button>
        </div>

        <pre class="flex-1 max-h-96 p-3 bg-[#02050b] text-cyan-200 font-mono text-xs rounded-lg overflow-auto border border-[#132a4a] leading-relaxed select-text"><code>{{ codigoMermaidC4 }}</code></pre>

        <div class="flex items-center justify-between pt-2">
          <span class="text-slate-500 text-xs font-mono">Listo para renderizar en Mermaid.js o exportar.</span>
          <div class="flex items-center gap-2">
            <button
              @click="copiarTexto(codigoMermaidC4)"
              class="px-3 py-1.5 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-xs font-mono transition cursor-pointer"
            >
              {{ copiadoExitoso ? '✓ Copiado' : '📋 Copiar' }}
            </button>
            <button
              @click="enviarC4AlChat"
              class="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-slate-900 font-bold text-xs font-mono transition cursor-pointer"
            >
              💬 Enviar al Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes dash {
  to {
    stroke-dashoffset: -1000;
  }
}
</style>
