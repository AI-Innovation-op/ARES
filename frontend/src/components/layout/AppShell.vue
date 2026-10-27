<script setup lang="ts">
import TacticalHUD from '../hud/TacticalHUD.vue';
import BioPanel from '../hud/BioPanel.vue';
import AvatarManager from '../avatar/AvatarManager.vue';
import ChatConsole from '../chat/ChatConsole.vue';
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[#040914] overflow-hidden text-slate-100">
    <!-- 1. Barra Superior HUD -->
    <TacticalHUD />

    <!-- 2. Panel de Telemetría Bio-Armadura -->
    <BioPanel />

    <!-- 3. Contenedor Principal Dividido -->
    <main class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <!-- Columna Izquierda: Visor del Avatar (36% en desktop) -->
      <aside class="h-64 md:h-full md:w-[36%] shrink-0">
        <AvatarManager />
      </aside>

      <!-- Columna Derecha: Consola Táctica Exclusiva (64%) -->
      <section class="flex-1 flex flex-col h-full overflow-hidden bg-[#040914]">
        <ChatConsole />
      </section>
    </main>
  </div>
</template>
