<script setup lang="ts">
import { useFsmStore, POSES_16 } from '../../stores/fsm.store.js';
import type { NumeroPose } from '../../types/ares.types.js';

const fsm = useFsmStore();

function seleccionarPose(id: NumeroPose) {
  fsm.fijarPoseDirecta(id);
}
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-y-auto space-y-4">
    <!-- Encabezado de la Matriz -->
    <div class="pb-3 border-b border-[#132a4a] flex items-center justify-between">
      <div>
        <h2 class="font-orbitron font-bold text-base text-slate-100 flex items-center gap-2">
          <span>🎭</span> MATRIZ CANÓNICA DE 16 POSES // FSM VISUAL
        </h2>
        <p class="text-xs font-mono text-slate-400">
          Haz clic en cualquier pose para adoptarla inmediatamente en el avatar 3D/2D.
        </p>
      </div>

      <div class="text-xs font-mono text-[#00ffaa] bg-[#091326] px-3 py-1 rounded border border-[#132a4a]">
        ACTIVA: POSE #{{ fsm.poseActual.id }} ({{ fsm.poseActual.name }})
      </div>
    </div>

    <!-- Cuadrícula 4x4 de las 16 Poses -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div
        v-for="p in POSES_16"
        :key="p.id"
        @click="seleccionarPose(p.id)"
        :class="[
          'p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 relative overflow-hidden select-none',
          fsm.poseActual.id === p.id
            ? 'border-[#00ffaa] bg-[#00ffaa]/10 shadow glow-neon'
            : 'border-[#132a4a] bg-[#091326] hover:border-cyan-500 hover:bg-[#091326]/80',
        ]"
      >
        <div class="flex items-center justify-between text-xs font-mono mb-1">
          <span class="font-bold text-cyan-400">#{{ p.id }} // {{ p.code }}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-[#040914] text-[#00ffaa] border border-[#132a4a]">
            {{ p.eyes }}
          </span>
        </div>

        <div class="font-orbitron font-bold text-xs text-slate-100 mb-1">
          {{ p.name }}
        </div>

        <p class="text-[11px] font-mono text-slate-400 line-clamp-2 mb-2">
          {{ p.description }}
        </p>

        <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-[#132a4a]">
          <span>ESCUDO: {{ p.shield }}</span>
          <span>ACCIÓN: {{ p.action3d }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
