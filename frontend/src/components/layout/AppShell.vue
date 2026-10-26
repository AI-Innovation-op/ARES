<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
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

const tabActiva = ref(1);

function cambiarTab(tab: number) {
  tabActiva.value = tab;
}

// Atajos de teclado: Alt+1 a Alt+6
function handleKeydown(e: KeyboardEvent) {
  if (e.altKey && e.key >= '1' && e.key <= '6') {
    e.preventDefault();
    tabActiva.value = parseInt(e.key, 10);
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
        <TabBar :tab-activa="tabActiva" @cambiar-tab="cambiarTab" />

        <!-- Vistas de los Módulos -->
        <div class="flex-1 overflow-hidden relative">
          <ChatConsole v-show="tabActiva === 1" />
          <DocShieldModule v-show="tabActiva === 2" />
          <CodeSwordModule v-show="tabActiva === 3" />
          <ArchitectModule v-show="tabActiva === 4" />
          <PoseMatrixModule v-show="tabActiva === 5" />
          <TechSpecModule v-show="tabActiva === 6" />
        </div>
      </section>
    </main>
  </div>
</template>
