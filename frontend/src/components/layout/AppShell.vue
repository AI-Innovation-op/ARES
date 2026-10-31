<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useUiStore } from '../../stores/ui.store.js';
import TacticalHUD from '../hud/TacticalHUD.vue';
import AvatarManager from '../avatar/AvatarManager.vue';
import ChatConsole from '../chat/ChatConsole.vue';
import TacticalTerminal from '../hud/TacticalTerminal.vue';
import AppIcon from '../common/AppIcon.vue';
const ui = useUiStore();
const showCompanion = ref(false);
const desktop = ref(matchMedia('(min-width: 821px)').matches);
const media = matchMedia('(min-width: 821px)');
const resize = () => {
  desktop.value = media.matches;
};
onMounted(() => media.addEventListener('change', resize));
onUnmounted(() => media.removeEventListener('change', resize));
</script>
<template>
  <div class="ares-workspace">
    <a class="skip-link" href="#main-content">Ir a la conversación</a>
    <TacticalHUD />
    <div class="workspace-layout">
      <aside
        id="ares-companion"
        class="workspace-companion"
        :class="{ 'mobile-companion-open': showCompanion }"
      >
        <AvatarManager v-if="desktop || showCompanion" />
      </aside>
      <main
        id="main-content"
        class="workspace-main"
        :inert="!desktop && showCompanion"
        tabindex="-1"
      >
        <ChatConsole />
      </main>
    </div>
    <button
      class="mobile-companion-toggle"
      :aria-expanded="showCompanion"
      aria-controls="ares-companion"
      @click="showCompanion = !showCompanion"
    >
      <AppIcon :name="showCompanion ? 'close' : 'shield'" :size="18" />{{
        showCompanion ? 'Volver a la conversación' : 'Ver a ARES'
      }}
    </button>
    <TacticalTerminal v-if="ui.terminalAbierta" @cerrar="ui.terminalAbierta = false" />
  </div>
</template>
