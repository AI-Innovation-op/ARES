<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useChatStore } from '../../stores/chat.store.js';
import { useUiStore } from '../../stores/ui.store.js';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';
import GithubAuditModal from '../audit/GithubAuditModal.vue';

const chatStore = useChatStore();
const uiStore = useUiStore();
const scrollContainer = ref<HTMLDivElement | null>(null);
const mostrarHistorial = ref(false);
const exportado = ref(false);

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

        <!-- Botón Ingesta y Auditoría de GitHub (v2.9) -->
        <button
          @click="uiStore.toggleModalGithubAudit"
          class="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0b1b36] border border-[#00ffaa]/60 hover:border-[#00ffaa] hover:bg-[#00ffaa]/15 text-[#00ffaa] text-[11px] font-bold cursor-pointer transition shadow-[0_0_8px_rgba(0,255,170,0.2)]"
          title="Abrir analizador e ingesta táctica de repositorios GitHub"
        >
          <span>🔍</span>
          <span>GITHUB AUDIT</span>
        </button>
      </div>

      <!-- Selector de Modo Táctico (v2.9) -->
      <div class="hidden md:flex items-center gap-1 bg-[#040914] p-0.5 rounded border border-[#132a4a] text-[11px]">
        <button
          type="button"
          @click="uiStore.setModoTactico('centinela')"
          class="px-2 py-0.5 rounded transition cursor-pointer"
          :class="uiStore.modoTactico === 'centinela' ? 'bg-[#00ffaa]/20 border border-[#00ffaa]/50 text-[#00ffaa] font-bold' : 'text-slate-400 hover:text-slate-200'"
          title="Modo Centinela: Auditoría, rigor formal, DDD y blindaje OWASP"
        >
          🛡️ Centinela
        </button>
        <button
          type="button"
          @click="uiStore.setModoTactico('blitzkrieg')"
          class="px-2 py-0.5 rounded transition cursor-pointer"
          :class="uiStore.modoTactico === 'blitzkrieg' ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
          title="Modo Blitzkrieg: Prototipado veloz, interfaces interactivas y Live Preview instantáneo"
        >
          ⚡ Blitzkrieg
        </button>
        <button
          type="button"
          @click="uiStore.setModoTactico('arquitecto')"
          class="px-2 py-0.5 rounded transition cursor-pointer"
          :class="uiStore.modoTactico === 'arquitecto' ? 'bg-purple-500/20 border border-purple-400/50 text-purple-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
          title="Modo Arquitecto: RFCs profundos, diagramas C4 y ADRs"
        >
          🏛️ Arquitecto
        </button>
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
  </div>
</template>
