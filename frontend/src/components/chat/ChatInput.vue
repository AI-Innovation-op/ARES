<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'enviar', payload: { texto: string; imagenBase64?: string }): void;
}>();

defineProps<{
  cargando: boolean;
}>();

const texto = ref('');
const imagenBase64 = ref<string | undefined>(undefined);
const escuchando = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    enviar();
  }
}

function enviar() {
  if (!texto.value.trim() && !imagenBase64.value) return;
  emit('enviar', {
    texto: texto.value,
    imagenBase64: imagenBase64.value,
  });
  texto.value = '';
  imagenBase64.value = undefined;
}

function abrirSelectorImagen() {
  fileInput.value?.click();
}

function handleImagenSeleccionada(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const res = reader.result as string;
    // Extraer solo la parte base64 sin el prefijo data:...;base64,
    const base64 = res.split(',')[1];
    imagenBase64.value = base64;
  };
  reader.readAsDataURL(file);
}

function removerImagen() {
  imagenBase64.value = undefined;
}

// Dictado por voz mediante Web Speech API
function toggleDictado() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Tu navegador no soporta Web Speech API para dictado por voz.');
    return;
  }

  if (escuchando.value) {
    escuchando.value = false;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-PE';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    escuchando.value = true;
  };

  recognition.onresult = (event: any) => {
    const transcripcion = event.results[0][0].transcript;
    texto.value = texto.value ? `${texto.value} ${transcripcion}` : transcripcion;
    escuchando.value = false;
    // Auto-envío táctico al terminar el dictado para experiencia manos libres fluida
    if (texto.value.trim()) {
      enviar();
    }
  };

  recognition.onerror = () => {
    escuchando.value = false;
  };

  recognition.onend = () => {
    escuchando.value = false;
  };

  recognition.start();
}
</script>

<template>
  <div class="border-t border-[#132a4a] bg-[#091326] p-3">
    <!-- Vista previa de imagen adjunta -->
    <div v-if="imagenBase64" class="mb-2 flex items-center gap-2 bg-[#040914] p-1.5 rounded border border-[#132a4a] w-fit">
      <span class="text-xs font-mono text-cyan-300">📷 CAPTURA TÁCTICA ADJUNTA</span>
      <button
        @click="removerImagen"
        class="text-xs text-rose-400 hover:text-rose-300 px-1 font-bold cursor-pointer"
        title="Quitar imagen"
      >
        ✕
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleImagenSeleccionada"
    />

    <div class="flex items-end gap-2">
      <!-- Botón de Cámara / Captura -->
      <button
        type="button"
        @click="abrirSelectorImagen"
        class="p-2.5 rounded-lg border border-[#132a4a] bg-[#040914] hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
        title="Adjuntar captura de pantalla o diagrama de arquitectura"
      >
        📷
      </button>

      <!-- Botón de Micrófono / Dictado -->
      <button
        type="button"
        @click="toggleDictado"
        :class="[
          'p-2.5 rounded-lg border transition-colors cursor-pointer shrink-0',
          escuchando
            ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
            : 'border-[#132a4a] bg-[#040914] hover:border-[#00ffaa] text-slate-300 hover:text-[#00ffaa]',
        ]"
        :title="escuchando ? 'Escuchando tu orden...' : 'Dictar orden táctica por voz'"
      >
        🎤
      </button>

      <!-- Área de Entrada de Texto -->
      <textarea
        v-model="texto"
        rows="2"
        @keydown="handleKeydown"
        placeholder="Orden para A.R.E.S. (Shift+Enter para nueva línea)..."
        class="flex-1 bg-[#040914] border border-[#132a4a] focus:border-[#00ffaa] rounded-lg p-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none resize-none font-sans"
      ></textarea>

      <!-- Botón de Envío -->
      <button
        type="button"
        :disabled="cargando || (!texto.trim() && !imagenBase64)"
        @click="enviar"
        class="px-4 py-2.5 rounded-lg font-orbitron text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-1.5"
        :class="
          cargando
            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            : 'bg-[#00ffaa] hover:bg-[#00e699] text-[#040914] shadow glow-neon'
        "
      >
        <span v-if="cargando" class="animate-spin">⏳</span>
        <span v-else>⚔️</span>
        <span>{{ cargando ? 'PROCESANDO' : 'EJECUTAR' }}</span>
      </button>
    </div>
  </div>
</template>
