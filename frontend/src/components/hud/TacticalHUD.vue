<script setup lang="ts">
import { useFsmStore } from '../../stores/fsm.store.js';
import { useAudio } from '../../composables/useAudio.js';
import { useTacticalVoice } from '../../composables/useTacticalVoice.js';

const fsm = useFsmStore();
const { audioSilenciado, toggleSilencio } = useAudio();
const { vozHabilitada, toggleVoz } = useTacticalVoice();
</script>

<template>
  <header class="h-14 border-b border-[#132a4a] bg-[#091326] px-4 flex items-center justify-between select-none">
    <!-- Identidad del Agente -->
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded border border-[#00ffaa]/50 bg-[#040914] flex items-center justify-center text-lg shadow-sm">
        🛡️
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="font-orbitron font-bold text-sm tracking-widest text-slate-100">
            A.R.E.S. <span class="text-[#00ffaa] text-xs font-normal">v2.6 CORE</span>
          </h1>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/60 border border-cyan-800 text-cyan-300">
            J.A.R.V.I.S.
          </span>
        </div>
        <p class="text-[10px] font-mono text-slate-400">
          Autonomous Resilient Engineering & Software-Doc God
        </p>
      </div>
    </div>

    <!-- Indicador Táctico Central: Postura FSM -->
    <div class="hidden md:flex items-center gap-2 bg-[#040914] px-3 py-1.5 rounded border border-[#132a4a]">
      <span class="text-xs font-mono text-slate-400">POSTURA:</span>
      <span class="font-orbitron text-xs font-bold text-glow-neon text-[#00ffaa]">
        {{ fsm.etiquetaHUD }}
      </span>
      <span class="text-xs font-mono text-cyan-400 border-l border-[#132a4a] pl-2 ml-1">
        P-{{ fsm.poseActual.id }}
      </span>
    </div>

    <!-- Controles Rápidos -->
    <div class="flex items-center gap-2">
      <!-- Voz Táctica TTS Toggle -->
      <button
        @click="toggleVoz"
        class="px-2.5 py-1.5 rounded border border-[#132a4a] bg-[#040914] hover:border-cyan-400 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
        :title="vozHabilitada ? 'Voz táctica de A.R.E.S. activa' : 'Voz táctica desactivada'"
      >
        <span>🎙️</span>
        <span :class="vozHabilitada ? 'text-cyan-300 font-bold' : 'text-slate-500'">
          {{ vozHabilitada ? 'VOZ: ON' : 'VOZ: OFF' }}
        </span>
      </button>

      <!-- Mute SFX Toggle -->
      <button
        @click="toggleSilencio"
        class="px-2.5 py-1.5 rounded border border-[#132a4a] bg-[#040914] hover:border-slate-500 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
        :title="audioSilenciado ? 'Activar efectos de sonido' : 'Silenciar sonido'"
      >
        <span v-if="audioSilenciado">🔇 SFX OFF</span>
        <span v-else class="text-[#00ffaa]">🔊 SFX ON</span>
      </button>

      <!-- Indicador de Enlace -->
      <div class="flex items-center gap-1.5 bg-[#040914] px-2.5 py-1.5 rounded border border-[#132a4a] text-xs font-mono text-emerald-400">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span>LINK ACTIVE</span>
      </div>
    </div>
  </header>
</template>
