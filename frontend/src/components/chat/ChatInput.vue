<script setup lang="ts">
import { ref } from 'vue';
import { voiceService } from '../../services/voice.service.js';

const emit = defineEmits<{
  (e: 'enviar', payload: { texto: string; imagenBase64?: string }): void;
}>();

defineProps<{
  cargando: boolean;
}>();

const texto = ref('');
const imagenBase64 = ref<string | undefined>(undefined);
const fileInput = ref<HTMLInputElement | null>(null);
const codeFileInput = ref<HTMLInputElement | null>(null);

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
  if (voiceService.estado.value === 'escuchando') {
    voiceService.detenerEscucha();
  }
}

function abrirSelectorImagen() {
  fileInput.value?.click();
}

function abrirSelectorCodigo() {
  codeFileInput.value?.click();
}

function handleImagenSeleccionada(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const res = reader.result as string;
    const base64 = res.split(',')[1];
    imagenBase64.value = base64;
  };
  reader.readAsDataURL(file);
}

function handleCodigoSeleccionado(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const contenido = reader.result as string;
    const ext = file.name.split('.').pop() || 'txt';
    texto.value = `A.R.E.S., audita e inspecciona el archivo adjunto "${file.name}":\n\`\`\`${ext}\n${contenido.slice(0, 10000)}\n\`\`\``;
  };
  reader.readAsText(file);
}

function removerImagen() {
  imagenBase64.value = undefined;
}

function toggleMic() {
  voiceService.toggleEscucha({
    onTranscripcion: (transcrito) => {
      texto.value = transcrito;
    },
    onComandoEnviar: () => {
      enviar();
    },
  });
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

    <input
      ref="codeFileInput"
      type="file"
      accept=".ts,.js,.vue,.py,.json,.sql,.md,.txt,.java,.go,.rs,.yml,.yaml,.html"
      class="hidden"
      @change="handleCodigoSeleccionado"
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

      <!-- Botón de Adjuntar Archivo de Código -->
      <button
        type="button"
        @click="abrirSelectorCodigo"
        class="p-2.5 rounded-lg border border-[#132a4a] bg-[#040914] hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
        title="Adjuntar archivo de código local para auditar (.ts, .py, .vue, .json, .sql, etc.)"
      >
        📎
      </button>

      <!-- Botón de Micrófono Táctico v2.9 -->
      <button
        type="button"
        @click="toggleMic"
        class="p-2.5 rounded-lg border transition-all cursor-pointer shrink-0"
        :class="[
          voiceService.estado.value === 'escuchando'
            ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]'
            : voiceService.estado.value === 'solicitando'
            ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-spin'
            : 'border-[#132a4a] bg-[#040914] hover:border-[#00ffaa] text-slate-300 hover:text-[#00ffaa]'
        ]"
        :title="
          voiceService.estado.value === 'escuchando'
            ? 'Detener escucha por voz'
            : 'Activar dictado y órdenes por voz táctica (Web Speech API)'
        "
      >
        <span v-if="voiceService.estado.value === 'escuchando'">🎙️</span>
        <span v-else-if="voiceService.estado.value === 'solicitando'">⏳</span>
        <span v-else>🎤</span>
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
