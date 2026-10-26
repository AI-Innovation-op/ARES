<script setup lang="ts">
import { useBioStore } from '../../stores/bio.store.js';

const bio = useBioStore();
</script>

<template>
  <div class="border-b border-[#132a4a] bg-[#091326]/90 px-4 py-2 text-xs font-mono">
    <!-- Alerta Espartana Emergente si se activa -->
    <div
      v-if="bio.alertaActiva"
      class="mb-2 p-2 bg-rose-950/80 border border-rose-600 rounded flex items-center justify-between text-rose-200 animate-pulse"
    >
      <div class="flex items-center gap-2">
        <span class="text-base">❤️‍🩹</span>
        <span>{{ bio.alertaActiva }}</span>
      </div>
      <button
        @click="bio.descartarAlerta"
        class="text-xs px-2 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white cursor-pointer"
      >
        ENTENDIDO
      </button>
    </div>

    <!-- Barra de Telemetría Biológica -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
      <!-- 1. Hidratación -->
      <div class="flex items-center justify-between bg-[#040914] px-2.5 py-1.5 rounded border border-[#132a4a]">
        <div class="flex items-center gap-1.5">
          <span class="text-cyan-400">💧</span>
          <span class="text-slate-400">AGUA:</span>
          <span class="font-bold text-cyan-300">{{ Math.round(bio.aguaPct) }}%</span>
        </div>
        <button
          @click="bio.hidratar"
          class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 cursor-pointer"
          title="Tomar un vaso de agua (+20%)"
        >
          +HIDRATAR
        </button>
      </div>

      <!-- 2. Estamina -->
      <div class="flex items-center justify-between bg-[#040914] px-2.5 py-1.5 rounded border border-[#132a4a]">
        <div class="flex items-center gap-1.5">
          <span>⚡</span>
          <span class="text-slate-400">ESTAMINA:</span>
          <span :class="['font-bold', bio.colorEstamina]">{{ bio.estaminaPct }}%</span>
        </div>
        <div class="w-14 bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            class="h-full transition-all duration-500"
            :class="bio.estaminaPct >= 70 ? 'bg-emerald-400' : bio.estaminaPct >= 40 ? 'bg-amber-400' : 'bg-rose-500'"
            :style="{ width: `${bio.estaminaPct}%` }"
          ></div>
        </div>
      </div>

      <!-- 3. Tiempo de Sesión -->
      <div class="flex items-center gap-2 bg-[#040914] px-2.5 py-1.5 rounded border border-[#132a4a]">
        <span class="text-slate-400">⏱️ SESIÓN:</span>
        <span class="font-bold text-slate-200">{{ bio.tiempoSesionFormateado }}</span>
      </div>

      <!-- 4. Sprint Pomodoro -->
      <div class="flex items-center justify-between bg-[#040914] px-2.5 py-1.5 rounded border border-[#132a4a]">
        <div class="flex items-center gap-1.5">
          <span class="text-[#00ffaa]">🎯</span>
          <span class="font-bold text-[#00ffaa]">{{ bio.tiempoSprintFormateado }}</span>
        </div>
        <button
          @click="bio.toggleSprint"
          class="text-[10px] px-2 py-0.5 rounded border font-semibold cursor-pointer"
          :class="bio.sprintActivo ? 'bg-rose-950 border-rose-700 text-rose-300' : 'bg-emerald-950 border-emerald-700 text-emerald-300'"
        >
          {{ bio.sprintActivo ? 'PAUSAR' : 'INICIAR SPRINT' }}
        </button>
      </div>
    </div>
  </div>
</template>
