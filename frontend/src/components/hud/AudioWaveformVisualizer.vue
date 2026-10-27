<script setup lang="ts">
import { voiceService } from '../../services/voice.service.js';

const emit = defineEmits<{
  (e: 'enviar'): void;
}>();

function toggleVoz() {
  voiceService.toggleEscucha();
}
</script>

<template>
  <div
    v-if="voiceService.estado.value === 'escuchando' || voiceService.estado.value === 'solicitando'"
    class="my-2 p-2.5 rounded-lg border border-[#00ffaa]/50 bg-[#040914]/90 backdrop-blur shadow-[0_0_15px_rgba(0,255,170,0.2)] font-mono text-xs transition-all animate-pulse"
  >
    <!-- Encabezado de Estado de Escucha -->
    <div class="flex items-center justify-between text-[11px] mb-1.5">
      <div class="flex items-center gap-1.5 text-[#00ffaa] font-bold font-orbitron">
        <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
        <span class="text-xs">🎙️</span>
        <span>OÍDO DIGITAL ACTIVO // ESCUCHANDO...</span>
      </div>
      <button
        type="button"
        @click="toggleVoz"
        class="text-[10px] text-rose-400 hover:text-rose-200 cursor-pointer font-bold border border-rose-500/40 rounded px-1.5 py-0.5 hover:bg-rose-950/40"
      >
        ✕ CANCELAR
      </button>
    </div>

    <!-- Ondas Holográficas de Frecuencia de Audio (16 Bandas) -->
    <div class="flex items-end justify-center gap-1 h-8 px-2 py-1 bg-[#02050d] rounded border border-[#132a4a]">
      <div
        v-for="(nivel, idx) in voiceService.nivelesAudio.value"
        :key="idx"
        class="w-1.5 rounded-t transition-all duration-75"
        :style="{
          height: `${Math.max(10, nivel * 100)}%`,
          backgroundColor: nivel > 0.5 ? '#00ffaa' : nivel > 0.25 ? '#0284c7' : '#0f3156',
          boxShadow: nivel > 0.4 ? '0 0 8px rgba(0,255,170,0.6)' : 'none',
        }"
      ></div>
    </div>

    <!-- Previsualización de Transcripción en Vivo -->
    <div class="mt-2 text-[11px] text-slate-300 italic min-h-[1.25rem] truncate flex items-center justify-between gap-2">
      <span class="truncate flex-1">
        <span class="text-cyan-400 font-bold">»</span>
        {{ voiceService.transcripcion.value || 'Habla con A.R.E.S. ("A.R.E.S., enviar" para despachar)...' }}
      </span>
      <button
        v-if="voiceService.transcripcion.value"
        type="button"
        @click="emit('enviar')"
        class="px-2 py-0.5 rounded bg-[#00ffaa] hover:bg-[#00e699] text-[#040914] text-[10px] font-orbitron font-bold shrink-0 cursor-pointer shadow-[0_0_8px_rgba(0,255,170,0.4)]"
      >
        ENVIAR AHORA ➔
      </button>
    </div>
  </div>
</template>
