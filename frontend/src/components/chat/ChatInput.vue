<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { voiceService } from '../../services/voice.service.js';
import AppIcon from '../common/AppIcon.vue';
const props = defineProps<{ cargando: boolean; conectado: boolean }>();
const emit = defineEmits<{
  enviar: [payload: { texto: string; imagenBase64?: string }];
  detener: [];
  conectar: [];
}>();
const texto = ref(''),
  error = ref('');
const image = ref<string>(),
  attachment = ref('');
const imageInput = ref<HTMLInputElement | null>(null),
  codeInput = ref<HTMLInputElement | null>(null),
  textarea = ref<HTMLTextAreaElement | null>(null);
function enviar() {
  if (props.cargando || (!texto.value.trim() && !image.value)) return;
  if (!props.conectado) {
    emit('conectar');
    return;
  }
  emit('enviar', { texto: texto.value.trim(), imagenBase64: image.value });
  texto.value = '';
  image.value = undefined;
  attachment.value = '';
  error.value = '';
  if (voiceService.estado.value === 'escuchando') voiceService.detenerEscucha();
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    enviar();
  }
}
async function attach(event: Event, kind: 'image' | 'code') {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = '';
  if (file.size > (kind === 'image' ? 5_000_000 : 128_000)) {
    error.value =
      kind === 'image'
        ? 'La imagen debe pesar menos de 5 MB.'
        : 'El archivo debe pesar menos de 128 KB.';
    input.value = '';
    return;
  }
  try {
    if (kind === 'image') {
      if (!file.type.startsWith('image/')) throw new Error();
      image.value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      attachment.value = file.name;
    } else {
      const content = await file.text();
      if (content.includes('\0')) throw new Error();
      const language = file.name.split('.').pop() || 'text';
      texto.value = `Revisa el archivo ${file.name}:\n\n\`\`\`${language}\n${content.slice(0, 10000)}\n\`\`\``;
    }
  } catch {
    error.value = 'No se pudo leer el archivo. Prueba con una imagen o un archivo de texto.';
  } finally {
    input.value = '';
  }
}
function dictate() {
  voiceService.toggleEscucha({
    onTranscripcion: (value) => (texto.value = value),
    onComandoEnviar: enviar,
  });
}
defineExpose({
  setText: async (value: string) => {
    texto.value = value;
    await nextTick();
    textarea.value?.focus();
  },
});
</script>
<template>
  <form class="composer" @submit.prevent="enviar" aria-label="Enviar una consulta a ARES">
    <label for="ares-prompt" class="sr-only">Tu mensaje para ARES</label>
    <div v-if="attachment" class="attachment-chip">
      <AppIcon name="image" :size="15" /><span>{{ attachment }}</span
      ><button
        type="button"
        class="icon-button"
        aria-label="Quitar imagen adjunta"
        @click="
          image = undefined;
          attachment = '';
        "
      >
        <AppIcon name="close" :size="15" />
      </button>
    </div>
    <textarea
      id="ares-prompt"
      ref="textarea"
      v-model="texto"
      rows="3"
      placeholder="Cuéntame qué estás construyendo…"
      :disabled="cargando"
      @keydown="keydown"
      aria-describedby="composer-help composer-error"
    />
    <div class="composer-footer">
      <div class="composer-tools">
        <button
          type="button"
          class="icon-button"
          aria-label="Adjuntar archivo de código"
          :disabled="cargando"
          @click="codeInput?.click()"
        >
          <AppIcon name="clip" :size="19" />
        </button>
        <button
          type="button"
          class="icon-button"
          aria-label="Adjuntar una imagen"
          :disabled="cargando"
          @click="imageInput?.click()"
        >
          <AppIcon name="image" :size="19" />
        </button>
        <button
          type="button"
          class="icon-button"
          :class="{ 'is-listening': voiceService.estado.value === 'escuchando' }"
          :aria-label="
            voiceService.estado.value === 'escuchando'
              ? 'Detener dictado'
              : 'Activar dictado por voz'
          "
          :disabled="cargando || !voiceService.esSoportado"
          :title="
            voiceService.esSoportado
              ? 'Dictar un mensaje'
              : 'El dictado no está disponible en este navegador'
          "
          @click="dictate"
        >
          <AppIcon name="mic" :size="19" />
        </button>
        <span id="composer-help" class="composer-shortcut"
          >Enter para enviar<span> · Shift + Enter para una línea nueva</span></span
        >
      </div>
      <button
        v-if="cargando"
        type="button"
        class="send-button stop-button"
        @click="emit('detener')"
      >
        <span>Detener</span><AppIcon name="pause" :size="19" /></button
      ><button v-else type="submit" class="send-button" :disabled="!texto.trim() && !image">
        <span>Enviar</span><AppIcon name="arrow" :size="19" />
      </button>
    </div>
    <p
      v-if="error || voiceService.error.value"
      id="composer-error"
      class="field-error"
      role="alert"
    >
      {{ error || voiceService.error.value }}
    </p>
    <span v-else id="composer-error" class="sr-only" />
    <input
      ref="codeInput"
      class="sr-only"
      tabindex="-1"
      type="file"
      accept=".ts,.js,.vue,.py,.json,.sql,.md,.txt,.java,.go,.rs,.yml,.yaml,.html,.cs"
      @change="attach($event, 'code')"
      aria-label="Archivo de código"
    />
    <input
      ref="imageInput"
      class="sr-only"
      tabindex="-1"
      type="file"
      accept="image/*"
      @change="attach($event, 'image')"
      aria-label="Imagen adjunta"
    />
  </form>
</template>
