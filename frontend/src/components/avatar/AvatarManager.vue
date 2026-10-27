<script setup lang="ts">
import { ref } from 'vue';
import { useFsmStore } from '../../stores/fsm.store.js';
import AvatarCanvas3D from './AvatarCanvas3D.vue';
import AvatarCanvas2D from './AvatarCanvas2D.vue';
import MatrixRainCanvas from '../common/MatrixRainCanvas.vue';
import TechSpecModule from '../modules/TechSpecModule.vue';
import AudioWaveformVisualizer from '../hud/AudioWaveformVisualizer.vue';

const fsm = useFsmStore();
const mostrarFichaTecnica = ref(false);
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

    <!-- Panel de Estado de Pose Inferior y Ficha Técnica -->
    <div class="p-3 border-t border-[#132a4a] bg-[#091326]/80 text-xs font-mono space-y-2">
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

      <!-- Visualizador de Ondas Holográficas de Oído Digital (v2.9) -->
      <AudioWaveformVisualizer />

      <!-- Botón Táctico Ficha Técnica debajo del Avatar -->
      <div class="pt-1">
        <button
          type="button"
          @click="mostrarFichaTecnica = true"
          class="w-full py-1.5 px-3 rounded border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 hover:border-cyan-400 text-cyan-300 font-mono text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[0_0_8px_rgba(0,229,255,0.15)]"
          title="Consultar especificaciones, arquitectura y datos técnicos de A.R.E.S."
        >
          <span>📋</span>
          <span>FICHA TÉCNICA MAESTRA</span>
        </button>
      </div>
    </div>

    <!-- Modal Ficha Técnica Maestra -->
    <div
      v-if="mostrarFichaTecnica"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      @click.self="mostrarFichaTecnica = false"
    >
      <div class="bg-[#071329] border border-cyan-500/60 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden">
        <div class="p-3 border-b border-[#132a4a] bg-[#091326] flex items-center justify-between">
          <div class="flex items-center gap-2 font-orbitron font-bold text-slate-100 text-sm">
            <span>📋</span>
            <span>FICHA TÉCNICA MAESTRA // J.A.R.V.I.S. CORE</span>
          </div>
          <button
            @click="mostrarFichaTecnica = false"
            class="text-slate-400 hover:text-white px-2.5 py-1 text-xs font-mono cursor-pointer rounded hover:bg-rose-950/50 hover:text-rose-300 transition"
          >
            ✕ CERRAR
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <TechSpecModule />
        </div>
      </div>
    </div>
  </div>
</template>
