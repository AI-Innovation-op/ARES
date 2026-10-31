<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useChatStore } from '../../stores/chat.store.js';
import { useConnectionStore } from '../../stores/connection.store.js';
import { useUiStore } from '../../stores/ui.store.js';
import { useAudio } from '../../composables/useAudio.js';
import { useTacticalVoice } from '../../composables/useTacticalVoice.js';
import { leerClave, guardarClave } from '../../services/http.js';
import AppIcon from '../common/AppIcon.vue';
const chat = useChatStore(),
  connection = useConnectionStore(),
  ui = useUiStore();
const { audioSilenciado, toggleSilencio } = useAudio();
const { vozHabilitada, toggleVoz } = useTacticalVoice();
const dialog = ref<HTMLDialogElement | null>(null);
const key = ref(''),
  remember = ref(false),
  saving = ref(false);
const catalogue = computed(() =>
  connection.models.length
    ? connection.models
    : [{ id: 'auto', nombre: 'Selecciona una conexión', proveedor: 'auto' }],
);
watch(
  () => connection.models,
  (models) => {
    chat.modelosDisponibles = models;
    if (models.length) {
      const model = models.find((model) => model.id === chat.modeloSeleccionado) ?? models[0]!;
      chat.cambiarModelo(model.id, model.proveedor === 'openrouter' ? 'openrouter' : 'gemini');
    }
  },
  { immediate: true },
);
function openSettings() {
  key.value = leerClave();
  dialog.value?.showModal();
}
async function save() {
  saving.value = true;
  guardarClave(key.value, remember.value);
  await connection.check();
  saving.value = false;
  if (connection.state === 'online') {
    await chat.cargarConversaciones();
    dialog.value?.close();
    key.value = '';
  }
}
function selectModel(event: Event) {
  const id = (event.target as HTMLSelectElement).value;
  const model = catalogue.value.find((m) => m.id === id);
  chat.cambiarModelo(
    id,
    (model?.proveedor === 'auto' ? 'gemini' : model?.proveedor || 'gemini') as
      'gemini' | 'openrouter',
  );
}
function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.code === 'Backquote') {
    event.preventDefault();
    ui.toggleTerminal();
  }
}
onMounted(() => {
  connection.check();
  window.addEventListener('keydown', shortcut);
  window.addEventListener('ares:open-connection', openSettings);
});
onUnmounted(() => {
  window.removeEventListener('keydown', shortcut);
  window.removeEventListener('ares:open-connection', openSettings);
});
</script>
<template>
  <header class="workspace-header">
    <a class="brand" href="#main-content" aria-label="ARES, ir al espacio de trabajo"
      ><span class="brand-mark"><AppIcon name="shield" :size="25" /></span
      ><span><strong>A.R.E.S.</strong><span class="brand-caption">AI INNOVATION</span></span></a
    >
    <div class="workspace-breadcrumb">
      <span class="breadcrumb-divider">/</span><AppIcon name="layers" :size="15" /><span
        >Espacio de ingeniería</span
      ><span class="outline-badge">EQUIPO</span>
    </div>
    <div class="header-actions">
      <div class="model-picker">
        <label for="active-model" class="eyebrow">MODELO</label
        ><select
          id="active-model"
          :value="chat.modeloSeleccionado"
          :disabled="connection.state !== 'online'"
          @change="selectModel"
        >
          <option v-for="model in catalogue" :key="model.id" :value="model.id">
            {{ model.nombre.replace(/^[^\p{L}\p{N}]+/u, '') }}
          </option>
        </select>
      </div>
      <button
        class="connection-button"
        :class="`connection-${connection.state}`"
        @click="openSettings"
      >
        <span class="status-dot" /><span>{{ connection.label }}</span
        ><AppIcon name="chevronDown" :size="14" />
      </button>
      <button
        class="icon-button header-settings"
        aria-label="Abrir configuración"
        @click="openSettings"
      >
        <AppIcon name="settings" />
      </button>
    </div>
  </header>
  <dialog
    ref="dialog"
    class="workspace-dialog"
    aria-labelledby="connection-title"
    @close="key = ''"
  >
    <form @submit.prevent="save">
      <div class="dialog-heading">
        <span class="dialog-icon"><AppIcon name="key" :size="23" /></span
        ><button
          type="button"
          class="icon-button"
          aria-label="Cerrar configuración"
          @click="dialog?.close()"
        >
          <AppIcon name="close" />
        </button>
      </div>
      <span class="eyebrow">CONFIGURACIÓN PERSONAL</span>
      <h2 id="connection-title">Conecta tu espacio.</h2>
      <p class="dialog-description">
        Usa la clave de acceso de tu servidor ARES para conversar y recuperar tus misiones.
      </p>
      <label for="access-key" class="field-label">Clave de acceso ARES</label
      ><input
        id="access-key"
        v-model="key"
        type="password"
        autocomplete="off"
        placeholder="Introduce tu clave de acceso"
        :disabled="saving"
      />
      <p class="helper-text">
        Es la ARES_API_KEY del servidor, distinta de las claves de Gemini u OpenRouter. Las claves
        de los proveedores permanecen en el backend.
      </p>
      <label class="checkbox-field"
        ><input v-model="remember" type="checkbox" />Recordar en este navegador</label
      >
      <p class="connection-result" role="status">
        {{ connection.label }}<span v-if="connection.server"> · {{ connection.server }}</span>
      </p>
      <button type="submit" class="primary-button" :disabled="saving">
        <AppIcon :name="saving ? 'refresh' : 'arrow'" :size="18" />{{
          saving ? 'Comprobando…' : 'Guardar y conectar'
        }}
      </button>
      <div class="settings-divider" />
      <label v-if="connection.state === 'online'" for="settings-model" class="field-label"
        >Modelo activo</label
      ><select
        v-if="connection.state === 'online'"
        id="settings-model"
        class="settings-model"
        :value="chat.modeloSeleccionado"
        @change="selectModel"
      >
        <option v-for="model in catalogue" :key="model.id" :value="model.id">
          {{ model.nombre.replace(/^[^\p{L}\p{N}]+/u, '') }}
        </option>
      </select>
      <div class="settings-row">
        <span>Voz de respuesta</span
        ><button type="button" class="text-button" :aria-pressed="vozHabilitada" @click="toggleVoz">
          <AppIcon name="mic" :size="17" />{{ vozHabilitada ? 'Activada' : 'Desactivada' }}
        </button>
      </div>
      <div class="settings-row">
        <span>Efectos de sonido</span
        ><button
          type="button"
          class="text-button"
          :aria-pressed="!audioSilenciado"
          @click="toggleSilencio"
        >
          <AppIcon :name="audioSilenciado ? 'mute' : 'sound'" :size="17" />{{
            audioSilenciado ? 'Desactivados' : 'Activados'
          }}
        </button>
      </div>
      <div class="settings-row">
        <span>Terminal web</span
        ><button
          type="button"
          class="text-button"
          @click="
            ui.toggleTerminal();
            dialog?.close();
          "
        >
          <AppIcon name="terminal" :size="17" />Abrir
        </button>
      </div>
    </form>
  </dialog>
</template>
