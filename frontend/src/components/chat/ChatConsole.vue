<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useChatStore } from '../../stores/chat.store.js';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';

const chatStore = useChatStore();
const scrollContainer = ref<HTMLDivElement | null>(null);
const mostrarHistorial = ref(false);

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

function handleEnviar(payload: { texto: string; imagenBase64?: string }) {
  chatStore.enviarMensaje(payload.texto, payload.imagenBase64);
}

function comandoRapido(texto: string) {
  chatStore.enviarMensaje(texto);
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
      </div>

      <!-- Comandos Rápidos Tácticos -->
      <div class="flex items-center gap-2 overflow-x-auto py-0.5">
        <button
          @click="comandoRapido('Ares, reporte táctico del sistema')"
          class="px-2 py-0.5 rounded bg-[#040914] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-[11px] whitespace-nowrap cursor-pointer transition"
        >
          📊 Reporte
        </button>
        <button
          @click="comandoRapido('Ares, despliega el escudo y audita la arquitectura')"
          class="px-2 py-0.5 rounded bg-[#040914] border border-[#132a4a] hover:border-[#00ffaa] text-emerald-300 text-[11px] whitespace-nowrap cursor-pointer transition"
        >
          🛡️ Escudo
        </button>
        <button
          @click="comandoRapido('Ares, consejo de salud y recarga de estamina')"
          class="px-2 py-0.5 rounded bg-[#040914] border border-[#132a4a] hover:border-rose-400 text-rose-300 text-[11px] whitespace-nowrap cursor-pointer transition"
        >
          ❤️‍🩹 Bio
        </button>
      </div>

      <button
        @click="chatStore.limpiarConsola"
        class="text-slate-500 hover:text-slate-300 text-[11px] shrink-0 cursor-pointer transition ml-auto"
        title="Limpiar vista de consola"
      >
        Limpiar
      </button>
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
  </div>
</template>
