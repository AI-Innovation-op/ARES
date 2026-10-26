<script setup lang="ts">
import { useFsmStore } from '../../stores/fsm.store.js';
import AvatarCanvas3D from './AvatarCanvas3D.vue';
import AvatarCanvas2D from './AvatarCanvas2D.vue';
import MatrixRainCanvas from '../common/MatrixRainCanvas.vue';

const fsm = useFsmStore();
</script>

<template>
  <div class="h-full flex flex-col bg-[#040914] border-r border-[#132a4a] relative">
    <!-- Header del Avatar -->
    <div class="p-3 border-b border-[#132a4a] bg-[#091326]/60 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-[#00ffaa] animate-pulse"></div>
        <span class="font-orbitron text-xs font-bold tracking-wider text-slate-200">
          A.R.E.S. AVATAR CORE
        </span>
      </div>
      <button
        @click="fsm.toggleModoGrafico"
        class="text-[11px] font-mono px-2 py-0.5 rounded border border-[#132a4a] bg-[#040914] hover:border-[#00ffaa] text-cyan-300 transition-colors cursor-pointer"
        :title="fsm.modo3DActivo ? 'Cambiar a modo 2D Canvas' : 'Cambiar a modo 3D Three.js'"
      >
        {{ fsm.modo3DActivo ? 'MODO: 3D' : 'MODO: 2D' }}
      </button>
    </div>

    <!-- Visor Gráfico con Lluvia Matrix de Fondo -->
    <div class="flex-1 relative overflow-hidden bg-grid-tactical">
      <MatrixRainCanvas />
      <AvatarCanvas3D v-if="fsm.modo3DActivo" />
      <AvatarCanvas2D v-else />
    </div>

    <!-- Panel de Estado de Pose Inferior -->
    <div class="p-3 border-t border-[#132a4a] bg-[#091326]/80 text-xs font-mono space-y-1">
      <div class="flex items-center justify-between text-slate-400">
        <span>POSE #{{ fsm.poseActual.id }} // {{ fsm.poseActual.code }}</span>
        <span class="text-[#00ffaa] font-semibold">{{ fsm.poseActual.eyes }}</span>
      </div>
      <div class="text-cyan-300 font-bold truncate">
        {{ fsm.poseActual.name }}
      </div>
      <div class="text-[11px] text-slate-400 line-clamp-2">
        {{ fsm.poseActual.description }}
      </div>
    </div>
  </div>
</template>
