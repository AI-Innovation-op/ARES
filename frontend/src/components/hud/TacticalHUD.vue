<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useFsmStore } from '../../stores/fsm.store.js';
import { useChatStore } from '../../stores/chat.store.js';
import { useUiStore } from '../../stores/ui.store.js';
import { useAudio } from '../../composables/useAudio.js';
import { useTacticalVoice } from '../../composables/useTacticalVoice.js';

const fsm = useFsmStore();
const chatStore = useChatStore();
const uiStore = useUiStore();
const { audioSilenciado, toggleSilencio } = useAudio();
const { vozHabilitada, toggleVoz } = useTacticalVoice();

const modelosFallback = [
  { id: 'auto', nombre: 'AUTO: Enrutador Inteligente', proveedor: 'gemini', icono: '🤖' },
  { id: 'gemini-3-flash-preview', nombre: 'Gemini 3 Flash', proveedor: 'gemini', icono: '🟣' },
  { id: 'deepseek/deepseek-chat', nombre: 'DeepSeek V3', proveedor: 'openrouter', icono: '⚡' },
  { id: 'deepseek/deepseek-r1-0528', nombre: 'DeepSeek R1', proveedor: 'openrouter', icono: '🧠' },
  { id: 'openai/gpt-4o', nombre: 'GPT-4o', proveedor: 'openrouter', icono: '🟢' },
  { id: 'anthropic/claude-3.5-sonnet', nombre: 'Claude 3.5', proveedor: 'openrouter', icono: '🟠' },
];

const listaModelos = computed(() => {
  return chatStore.modelosDisponibles.length > 0 ? chatStore.modelosDisponibles : modelosFallback;
});

function handleKeydown(e: KeyboardEvent) {
  // Atajo Ctrl + ` o Ctrl + ~ para alternar la terminal táctica
  if (e.ctrlKey && (e.key === '`' || e.key === '~' || e.code === 'Backquote')) {
    e.preventDefault();
    uiStore.toggleTerminal();
  }
}

onMounted(() => {
  chatStore.cargarModelos();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function onSelectModelo(id: string) {
  const mod = listaModelos.value.find((m: any) => m.id === id);
  const prov = mod?.proveedor || (id.startsWith('gemini') ? 'gemini' : 'openrouter');
  chatStore.cambiarModelo(id, prov as any);
}
</script>

<template>
  <header class="h-14 border-b border-[#132a4a] bg-[#091326] px-4 flex items-center justify-between select-none gap-2">
    <!-- Identidad del Agente -->
    <div class="flex items-center gap-3 shrink-0">
      <div class="w-8 h-8 rounded border border-[#00ffaa]/50 bg-[#040914] flex items-center justify-center text-lg shadow-sm">
        🛡️
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="font-orbitron font-bold text-sm tracking-widest text-slate-100">
            A.R.E.S. <span class="text-[#00ffaa] text-xs font-normal">v4.5.0 SOVEREIGN RELEASE</span>
          </h1>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/60 border border-cyan-800 text-cyan-300">
            SOVEREIGN CORE
          </span>
        </div>
        <p class="text-[10px] font-mono text-slate-400 hidden sm:block">
          Autonomous Resilient Engineering & Software-Doc God
        </p>
      </div>
    </div>

    <!-- Selector Táctico de Modelo LLM (Gemini / OpenRouter) -->
    <div class="flex items-center gap-1.5 bg-[#040914] px-2.5 py-1 rounded border border-cyan-500/40 text-xs font-mono shadow-[0_0_10px_rgba(0,229,255,0.1)]">
      <span class="text-slate-400 text-[10px] hidden md:inline">NÚCLEO IA:</span>
      <select
        :value="chatStore.modeloSeleccionado"
        @change="(e: any) => onSelectModelo(e.target.value)"
        class="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer text-xs"
        title="Cambiar motor de Inteligencia Artificial"
      >
        <option
          v-for="m in listaModelos"
          :key="m.id"
          :value="m.id"
          class="bg-[#091326] text-slate-200"
        >
          {{ m.icono }} {{ m.nombre }}
        </option>
      </select>
    </div>

    <!-- Indicador Táctico Central: Postura FSM -->
    <div class="hidden lg:flex items-center gap-2 bg-[#040914] px-3 py-1.5 rounded border border-[#132a4a]">
      <span class="text-xs font-mono text-slate-400">POSTURA:</span>
      <span class="font-orbitron text-xs font-bold text-glow-neon text-[#00ffaa]">
        {{ fsm.etiquetaHUD }}
      </span>
      <span class="text-xs font-mono text-cyan-400 border-l border-[#132a4a] pl-2 ml-1">
        P-{{ fsm.poseActual.id }}
      </span>
    </div>

    <!-- Controles Rápidos -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Terminal Táctica Shell Trigger (v2.8) -->
      <button
        type="button"
        @click="uiStore.toggleTerminal"
        class="px-2.5 py-1.5 rounded border transition cursor-pointer flex items-center gap-1.5 text-xs font-mono"
        :class="uiStore.terminalAbierta ? 'border-[#00ffaa] bg-[#00ffaa]/20 text-[#00ffaa] font-bold shadow-[0_0_10px_rgba(0,255,170,0.4)]' : 'border-[#132a4a] bg-[#040914] text-slate-300 hover:border-cyan-400 hover:text-cyan-300'"
        title="Abrir/Cerrar Terminal Táctica Shell (Atajo: Ctrl + \`)"
      >
        <span class="text-[#00ffaa] font-bold">>_</span>
        <span class="hidden sm:inline">TERMINAL</span>
      </button>

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
        <span class="hidden sm:inline">ONLINE</span>
      </div>
    </div>
  </header>
</template>
