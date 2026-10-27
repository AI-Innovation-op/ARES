<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useChatStore } from '../../stores/chat.store.js';
import { useUiStore } from '../../stores/ui.store.js';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';
import GithubAuditModal from '../audit/GithubAuditModal.vue';
import SwarmMonitorModal from '../swarm/SwarmMonitorModal.vue';
import PipelineMonitorModal from '../cicd/PipelineMonitorModal.vue';
import MemoryOracleModal from '../memory/MemoryOracleModal.vue';
import ArchitectureRadarModal from '../architecture/ArchitectureRadarModal.vue';
import AssignmentForgeModal from '../forge/AssignmentForgeModal.vue';
import BenchmarkSuiteModal from '../benchmark/BenchmarkSuiteModal.vue';

const chatStore = useChatStore();
const uiStore = useUiStore();
const scrollContainer = ref<HTMLDivElement | null>(null);
const mostrarHistorial = ref(false);
const exportado = ref(false);
const menuModulosAbierto = ref(false);

function abrirModulo(modulo: string) {
  menuModulosAbierto.value = false;
  if (modulo === 'forge') uiStore.modalForgeAbierto = true;
  else if (modulo === 'benchmark') uiStore.modalBenchmarkAbierto = true;
  else if (modulo === 'radar') uiStore.modalRadarAbierto = true;
  else if (modulo === 'memory') uiStore.modalMemoriaAbierto = true;
  else if (modulo === 'cicd') uiStore.modalCicdAbierto = true;
  else if (modulo === 'swarm') uiStore.modalSwarmAbierto = true;
  else if (modulo === 'audit') uiStore.modalGithubAuditAbierto = true;
}

const menuModoAbierto = ref(false);

const modosDisponibles = [
  {
    id: 'centinela',
    nombre: 'Centinela',
    icono: '🛡️',
    descripcion: 'Rigor formal, DDD y blindaje OWASP',
    badgeColor: 'border-[#00ffaa]/60 text-[#00ffaa] bg-[#00ffaa]/10 shadow-[0_0_8px_rgba(0,255,170,0.25)]',
  },
  {
    id: 'blitzkrieg',
    nombre: 'Blitzkrieg',
    icono: '⚡',
    descripcion: 'Prototipado rápido y Live Preview',
    badgeColor: 'border-cyan-400/60 text-cyan-300 bg-cyan-950/30 shadow-[0_0_8px_rgba(0,229,255,0.25)]',
  },
  {
    id: 'arquitecto',
    nombre: 'Arquitecto',
    icono: '🏛️',
    descripcion: 'RFCs profundos, diagramas C4 y ADRs',
    badgeColor: 'border-purple-400/60 text-purple-300 bg-purple-950/30 shadow-[0_0_8px_rgba(168,85,247,0.25)]',
  },
  {
    id: 'enjambre',
    nombre: 'Enjambre',
    icono: '🐝',
    descripcion: 'Swarm multi-agente: 4 especialistas',
    badgeColor: 'border-amber-400/60 text-amber-300 bg-amber-950/30 shadow-[0_0_8px_rgba(245,158,11,0.25)]',
  },
];

const modoActualInfo = computed(() => {
  return modosDisponibles.find((m) => m.id === uiStore.modoTactico) || modosDisponibles[0];
});

function seleccionarModo(id: any) {
  uiStore.setModoTactico(id);
  menuModoAbierto.value = false;
}

function cerrarMenuSiClickFuera(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.dropdown-arsenal-tactico')) {
    menuModulosAbierto.value = false;
  }
  if (!target.closest('.dropdown-modo-tactico')) {
    menuModoAbierto.value = false;
  }
}

function handleInsertarEnChat(prompt: string) {
  chatStore.enviarMensaje(prompt);
}

function exportarMisionActual() {
  if (chatStore.mensajes.length === 0) return;
  const fecha = new Date().toLocaleString();
  let doc = `# 🛡️ INFORME DE MISIÓN TÁCTICA A.R.E.S. (v2.9 J.A.R.V.I.S. Core)\n\n`;
  doc += `> **Fecha de Misión:** ${fecha}\n`;
  doc += `> **ID de Conversación:** ${chatStore.conversacionIdActual || 'sesion-activa'}\n`;
  doc += `> **Total de Intercambios:** ${chatStore.mensajes.length}\n`;
  doc += `> **Modo Táctico Activo:** ${uiStore.modoTactico.toUpperCase()}\n\n`;
  doc += `---\n\n`;

  for (const msg of chatStore.mensajes) {
    const rol = msg.role === 'user' ? '👤 COMANDANTE' : '🛡️ A.R.E.S. TACTICAL';
    const hora = new Date(msg.timestamp).toLocaleTimeString();
    doc += `### ${rol} [${hora}]\n\n${msg.content}\n\n---\n\n`;
  }

  const blob = new Blob([doc], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Mision_ARES_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);

  exportado.value = true;
  setTimeout(() => {
    exportado.value = false;
  }, 2500);
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}

onMounted(() => {
  scrollToBottom();
  chatStore.cargarConversaciones();
  window.addEventListener('click', cerrarMenuSiClickFuera);
});

onUnmounted(() => {
  window.removeEventListener('click', cerrarMenuSiClickFuera);
});

watch(
  () => chatStore.mensajes.length,
  () => {
    scrollToBottom();
  }
);

// Auto-scroll táctico durante el streaming token a token
watch(
  () => chatStore.mensajes[chatStore.mensajes.length - 1]?.content,
  () => {
    scrollToBottom();
  }
);

function handleEnviar(payload: { texto: string; imagenBase64?: string }) {
  chatStore.enviarMensaje(payload.texto, payload.imagenBase64);
}

function toggleHistorial() {
  mostrarHistorial.value = !mostrarHistorial.value;
  if (mostrarHistorial.value) {
    chatStore.cargarConversaciones();
  }
}

function seleccionarMision(id: string) {
  chatStore.seleccionarConversacion(id);
  mostrarHistorial.value = false;
}
</script>

<template>
  <div class="h-full flex flex-col bg-[#040914] relative">
    <!-- Barra superior de la consola con acciones rápidas y selector de sesión persistente -->
    <div class="px-3 py-2 border-b border-[#132a4a] bg-[#091326]/75 flex items-center justify-between text-xs font-mono gap-2">
      <!-- Selector de Misiones SQLite -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          @click="toggleHistorial"
          class="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0b1b36] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[11px] cursor-pointer transition shadow-[0_0_8px_rgba(0,229,255,0.15)]"
          title="Ver misiones y sesiones guardadas en SQLite"
        >
          <span>📜</span>
          <span class="font-bold">MISIONES</span>
          <span class="bg-cyan-950/80 text-cyan-400 px-1 rounded text-[10px]">{{ chatStore.conversaciones.length }}</span>
        </button>

        <button
          @click="chatStore.nuevaSesion()"
          class="flex items-center gap-1 px-2 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-emerald-400 text-emerald-300 text-[11px] cursor-pointer transition"
          title="Iniciar nueva misión táctica con memoria limpia"
        >
          <span>➕</span>
          <span class="hidden sm:inline">Nueva Misión</span>
        </button>

        <!-- Barra de Selección Táctica: Menú Desplegable de Arsenal de Módulos (v3.8) -->
        <div class="relative dropdown-arsenal-tactico">
          <button
            type="button"
            @click.stop="menuModulosAbierto = !menuModulosAbierto"
            class="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0b1b36] border border-cyan-400/60 hover:border-cyan-300 hover:bg-cyan-900/30 text-cyan-300 text-[11px] font-bold font-mono cursor-pointer transition shadow-[0_0_12px_rgba(0,229,255,0.2)]"
            title="Desplegar Arsenal Táctico de Módulos de Ingeniería A.R.E.S."
          >
            <span>⚡</span>
            <span>ARSENAL TÁCTICO</span>
            <span class="text-[9px] bg-cyan-950/90 px-1 py-0.2 rounded border border-cyan-700 text-cyan-300 font-bold">7</span>
            <span class="text-[9px] text-cyan-400 font-bold transition-transform duration-200" :class="menuModulosAbierto ? 'rotate-180' : ''">▼</span>
          </button>

          <!-- Menú Flotante Cyberpunk -->
          <div
            v-if="menuModulosAbierto"
            class="absolute left-0 mt-1.5 w-72 bg-[#061022] border border-cyan-500/60 rounded-lg shadow-2xl py-1 z-50 divide-y divide-[#132a4a] animate-fade-in font-mono text-xs backdrop-blur-md"
          >
            <div class="px-3 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-[#09152b] rounded-t">
              Módulos Especializados A.R.E.S.
            </div>

            <!-- 1. Forja Git DDD -->
            <button
              type="button"
              @click="abrirModulo('forge')"
              class="w-full px-3 py-2 text-left hover:bg-emerald-950/40 flex items-center gap-2.5 transition text-slate-200 hover:text-[#00ffaa] group cursor-pointer"
            >
              <span class="text-base group-hover:scale-110 transition">📋</span>
              <div>
                <div class="font-bold text-[11px]">Forja Soberana Git (v3.5)</div>
                <div class="text-[10px] text-slate-400">Desofuscador de PDF, Squad Matrix & Commits</div>
              </div>
            </button>

            <!-- 2. Suite E2E & Benchmarks -->
            <button
              type="button"
              @click="abrirModulo('benchmark')"
              class="w-full px-3 py-2 text-left hover:bg-amber-950/40 flex items-center gap-2.5 transition text-slate-200 hover:text-amber-300 group cursor-pointer"
            >
              <span class="text-base group-hover:scale-110 transition">🧪</span>
              <div>
                <div class="font-bold text-[11px]">Suite E2E & Benchmarks (v3.8)</div>
                <div class="text-[10px] text-slate-400">Mutación Stryker (MSI) & Grafana k6</div>
              </div>
            </button>

            <!-- 3. Radar de Arquitectura C4 -->
            <button
              type="button"
              @click="abrirModulo('radar')"
              class="w-full px-3 py-2 text-left hover:bg-cyan-950/40 flex items-center gap-2.5 transition text-slate-200 hover:text-cyan-300 group cursor-pointer"
            >
              <span class="text-base group-hover:scale-110 transition">🌐</span>
              <div>
                <div class="font-bold text-[11px]">Radar de Arquitectura C4 (v3.4)</div>
                <div class="text-[10px] text-slate-400">Topología distribuida, caos y tracing</div>
              </div>
            </button>

            <!-- 4. Memoria Vectorial -->
            <button
              type="button"
              @click="abrirModulo('memory')"
              class="w-full px-3 py-2 text-left hover:bg-purple-950/40 flex items-center gap-2.5 transition text-slate-200 hover:text-purple-300 group cursor-pointer"
            >
              <span class="text-base group-hover:scale-110 transition">🧠</span>
              <div>
                <div class="font-bold text-[11px]">Oráculo de Memoria Vectorial (v3.3)</div>
                <div class="text-[10px] text-slate-400">128D Cosine Similarity & RAG local</div>
              </div>
            </button>

            <!-- 5. CI/CD Pipeline Engine -->
            <button
              type="button"
              @click="abrirModulo('cicd')"
              class="w-full px-3 py-2 text-left hover:bg-cyan-950/40 flex items-center gap-2.5 transition text-slate-200 hover:text-cyan-300 group cursor-pointer"
            >
              <span class="text-base group-hover:scale-110 transition">🚀</span>
              <div>
                <div class="font-bold text-[11px]">CI/CD Pipeline Engine (v3.2)</div>
                <div class="text-[10px] text-slate-400">Orquestador de 6 etapas & Despliegues</div>
              </div>
            </button>

            <!-- 6. Enjambre Multi-Agente -->
            <button
              type="button"
              @click="abrirModulo('swarm')"
              class="w-full px-3 py-2 text-left hover:bg-purple-950/40 flex items-center gap-2.5 transition text-slate-200 hover:text-purple-300 group cursor-pointer"
            >
              <span class="text-base group-hover:scale-110 transition">🐝</span>
              <div>
                <div class="font-bold text-[11px]">Enjambre Multi-Agente Swarm (v3.1)</div>
                <div class="text-[10px] text-slate-400">Atenea, Vulcano, Mercurio, Némesis</div>
              </div>
            </button>

            <!-- 7. Ingesta GitHub -->
            <button
              type="button"
              @click="abrirModulo('audit')"
              class="w-full px-3 py-2 text-left hover:bg-emerald-950/40 flex items-center gap-2.5 transition text-slate-200 hover:text-[#00ffaa] group cursor-pointer"
            >
              <span class="text-base group-hover:scale-110 transition">🔍</span>
              <div>
                <div class="font-bold text-[11px]">Auditoría de GitHub & OWASP (v3.0)</div>
                <div class="text-[10px] text-slate-400">Análisis AST de repositorios remotos</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Acceso Rápido Directo a la Forja Soberana -->
        <button
          type="button"
          @click="uiStore.toggleModalForge"
          class="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded bg-[#07241c] border border-emerald-400/70 hover:border-[#00ffaa] hover:bg-[#00ffaa]/20 text-[#00ffaa] text-[11px] font-bold cursor-pointer transition shadow-[0_0_10px_rgba(0,255,170,0.2)]"
          title="Abrir Forja Soberana de Ejercicios DDD"
        >
          <span>📋</span>
          <span>FORJA GIT</span>
        </button>
      </div>

      <!-- Selector Compacto de Modo Táctico: Barra de Selección Dropdown (v3.8) -->
      <div class="relative dropdown-modo-tactico hidden sm:block">
        <button
          type="button"
          @click.stop="menuModoAbierto = !menuModoAbierto"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#040914] border text-[11px] font-mono font-bold cursor-pointer transition select-none"
          :class="modoActualInfo.badgeColor"
          :title="`Modo Táctico Actual: ${modoActualInfo.nombre}. Clic para cambiar de postura táctica.`"
        >
          <span class="text-xs">{{ modoActualInfo.icono }}</span>
          <span>{{ modoActualInfo.nombre }}</span>
          <span class="text-[9px] opacity-75 font-bold transition-transform duration-200" :class="menuModoAbierto ? 'rotate-180' : ''">▼</span>
        </button>

        <!-- Menú Flotante Cyberpunk de Modos Tácticos -->
        <div
          v-if="menuModoAbierto"
          class="absolute right-0 mt-1.5 w-64 bg-[#061022] border border-[#132a4a] rounded-lg shadow-2xl py-1 z-50 divide-y divide-[#132a4a] animate-fade-in font-mono text-xs backdrop-blur-md"
        >
          <div class="px-3 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-[#09152b] rounded-t flex items-center justify-between">
            <span>Postura / Modo Táctico</span>
            <span class="text-[9px] text-[#00ffaa]">FSM ACTIVE</span>
          </div>

          <button
            v-for="m in modosDisponibles"
            :key="m.id"
            type="button"
            @click="seleccionarModo(m.id)"
            class="w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer group"
            :class="uiStore.modoTactico === m.id ? 'bg-[#00ffaa]/15 text-[#00ffaa]' : 'text-slate-300 hover:bg-[#0b1b36] hover:text-slate-100'"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm group-hover:scale-110 transition">{{ m.icono }}</span>
              <div>
                <div class="font-bold text-[11px]">{{ m.nombre }}</div>
                <div class="text-[10px] text-slate-400">{{ m.descripcion }}</div>
              </div>
            </div>
            <span v-if="uiStore.modoTactico === m.id" class="text-xs text-[#00ffaa] font-bold">✓</span>
          </button>
        </div>
      </div>

      <!-- Acciones de Cabecera: Exportar Misión y Limpiar -->
      <div class="flex items-center gap-2 shrink-0 ml-auto">
        <button
          @click="exportarMisionActual"
          class="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0b1b36] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[11px] cursor-pointer transition shadow"
          :title="exportado ? '¡Misión exportada con éxito!' : 'Exportar el historial completo de la misión en Markdown (.md)'"
        >
          <span>{{ exportado ? '✓' : '📥' }}</span>
          <span class="hidden sm:inline">{{ exportado ? 'Exportado' : 'Exportar Misión' }}</span>
        </button>

        <button
          @click="chatStore.limpiarConsola"
          class="text-slate-500 hover:text-slate-300 text-[11px] cursor-pointer transition"
          title="Limpiar vista de consola"
        >
          Limpiar
        </button>
      </div>
    </div>

    <!-- Menú Desplegable / Drawer de Historial de Misiones (SQLite) -->
    <div
      v-if="mostrarHistorial"
      class="absolute top-10 left-3 z-30 w-80 max-h-96 bg-[#071329] border border-cyan-500/50 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.85)] p-3 font-mono flex flex-col backdrop-blur-md"
    >
      <div class="flex items-center justify-between border-b border-[#132a4a] pb-2 mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-cyan-300 tracking-wider">💾 HISTORIAL SQLITE</span>
          <span class="text-[10px] text-slate-400">({{ chatStore.conversaciones.length }})</span>
        </div>
        <button
          @click="mostrarHistorial = false"
          class="text-slate-400 hover:text-white text-xs cursor-pointer p-0.5"
        >
          ✕
        </button>
      </div>

      <div class="overflow-y-auto flex-1 space-y-1.5 pr-1 max-h-72">
        <div
          v-if="chatStore.conversaciones.length === 0"
          class="text-xs text-slate-500 text-center py-4"
        >
          Sin misiones previas guardadas aún.
        </div>

        <div
          v-for="c in chatStore.conversaciones"
          :key="c.id"
          class="group flex items-center justify-between p-2 rounded border transition text-left cursor-pointer"
          :class="[
            chatStore.conversacionIdActual === c.id
              ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200'
              : 'bg-[#040914]/80 border-[#132a4a] hover:border-cyan-500/50 text-slate-300'
          ]"
          @click="seleccionarMision(c.id)"
        >
          <div class="overflow-hidden pr-2">
            <div class="text-[11px] font-semibold truncate">{{ c.title || 'Misión Táctica' }}</div>
            <div class="text-[9px] text-slate-500">
              {{ new Date(c.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) }}
            </div>
          </div>
          <button
            @click.stop="chatStore.eliminarSesion(c.id)"
            class="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-200 text-xs px-1.5 py-0.5 rounded hover:bg-rose-950/50 transition cursor-pointer"
            title="Eliminar sesión permanentemente"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Indicador de carga de historial -->
    <div
      v-if="chatStore.cargandoHistorial"
      class="bg-cyan-950/40 border-b border-cyan-500/30 text-cyan-300 text-xs font-mono py-1 px-4 flex items-center gap-2"
    >
      <div class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
      <span>Cargando memoria táctica de la misión desde SQLite...</span>
    </div>

    <!-- Área de Mensajes Desplazable -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto px-4 py-2 space-y-1">
      <ChatMessage
        v-for="msg in chatStore.mensajes"
        :key="msg.id"
        :message="msg"
      />

      <!-- Indicador de razonamiento de A.R.E.S. -->
      <div v-if="chatStore.cargando" class="flex items-center gap-2 py-3 text-cyan-400 font-mono text-xs animate-pulse">
        <div class="w-2 h-2 rounded-full bg-[#00ffaa]"></div>
        <span>A.R.E.S. procesando con espada y escudo táctico...</span>
      </div>
    </div>

    <!-- Barra de Entrada -->
    <ChatInput :cargando="chatStore.cargando" @enviar="handleEnviar" />

    <!-- Modal Táctico de Ingesta y Auditoría de GitHub (v2.9) -->
    <GithubAuditModal
      v-if="uiStore.modalGithubAuditAbierto"
      @cerrar="uiStore.modalGithubAuditAbierto = false"
      @insertarEnChat="handleInsertarEnChat"
    />

    <!-- Modal Táctico de Enjambre Multi-Agente (v3.1) -->
    <SwarmMonitorModal
      v-if="uiStore.modalSwarmAbierto"
      @cerrar="uiStore.modalSwarmAbierto = false"
    />

    <!-- Modal Táctico de CI/CD & Despliegues Autónomos (v3.2) -->
    <PipelineMonitorModal
      v-if="uiStore.modalCicdAbierto"
      @cerrar="uiStore.modalCicdAbierto = false"
    />

    <!-- Modal Oráculo de Memoria Semántica Vectorial (v3.3) -->
    <MemoryOracleModal
      v-if="uiStore.modalMemoriaAbierto"
      @cerrar="uiStore.modalMemoriaAbierto = false"
    />

    <!-- Modal Radar de Arquitectura C4 & Tracing de Eventos (v3.4) -->
    <ArchitectureRadarModal
      v-if="uiStore.modalRadarAbierto"
      @cerrar="uiStore.modalRadarAbierto = false"
    />

    <!-- Modal Forja Soberana de Ejercicios & Git DDD (v3.5) -->
    <AssignmentForgeModal
      v-if="uiStore.modalForgeAbierto"
      @cerrar="uiStore.modalForgeAbierto = false"
    />

    <!-- Modal Suite de Pruebas E2E & Benchmarks DDD (v3.8) -->
    <BenchmarkSuiteModal
      v-if="uiStore.modalBenchmarkAbierto"
      @cerrar="uiStore.modalBenchmarkAbierto = false"
    />
  </div>
</template>
