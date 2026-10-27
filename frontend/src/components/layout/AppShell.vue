<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useUiStore } from '../../stores/ui.store.js';
import TacticalHUD from '../hud/TacticalHUD.vue';
import BioPanel from '../hud/BioPanel.vue';
import AvatarManager from '../avatar/AvatarManager.vue';
import TabBar from './TabBar.vue';

import ChatConsole from '../chat/ChatConsole.vue';
import DocShieldModule from '../modules/DocShieldModule.vue';
import CodeSwordModule from '../modules/CodeSwordModule.vue';
import ArchitectModule from '../modules/ArchitectModule.vue';
import PoseMatrixModule from '../modules/PoseMatrixModule.vue';
import TechSpecModule from '../modules/TechSpecModule.vue';

const uiStore = useUiStore();

// Atajos de teclado: Alt+1 a Alt+6
function handleKeydown(e: KeyboardEvent) {
  if (e.altKey && e.key >= '1' && e.key <= '6') {
    e.preventDefault();
    uiStore.navegarTab(parseInt(e.key, 10));
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[#040914] overflow-hidden text-slate-100">
    <!-- 1. Barra Superior HUD -->
    <TacticalHUD />

    <!-- 2. Panel de Telemetría Bio-Armadura -->
    <BioPanel />

    <!-- 3. Contenedor Principal Dividido -->
    <main class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <!-- Columna Izquierda: Visor del Avatar (35% en desktop) -->
      <aside class="h-64 md:h-full md:w-[36%] shrink-0">
        <AvatarManager />
      </aside>

      <!-- Columna Derecha: Contenido Táctico / Módulos (65%) -->
      <section class="flex-1 flex flex-col h-full overflow-hidden bg-[#040914]">
        <!-- Barra de Navegación de Pestañas -->
        <TabBar :tab-activa="uiStore.tabActiva" @cambiar-tab="uiStore.navegarTab" />

        <!-- Vistas de los Módulos -->
        <div class="flex-1 overflow-hidden relative">
          <ChatConsole v-show="uiStore.tabActiva === 1" />
          <DocShieldModule v-show="uiStore.tabActiva === 2" />
          <CodeSwordModule v-show="uiStore.tabActiva === 3" />
          <ArchitectModule v-show="uiStore.tabActiva === 4" />
          <PoseMatrixModule v-show="uiStore.tabActiva === 5" />
          <TechSpecModule v-show="uiStore.tabActiva === 6" />
        </div>
      </section>
    </main>
  </div>
</template>
