<script setup lang="ts">
import type { Metricas } from '../../types/ares.types.js';

defineProps<{
  metrics: Metricas | null;
}>();
</script>

<template>
  <div v-if="metrics" class="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3 font-mono text-xs">
    <!-- Tarjeta Big-O -->
    <div class="p-3 bg-[#040914] border border-[#132a4a] rounded-lg">
      <div class="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
        <span>COMPLEJIDAD BIG-O</span>
        <span>🚀</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-rose-400 line-through">{{ metrics.bigO_antes }}</span>
        <span class="text-slate-500">→</span>
        <span class="text-emerald-400 font-bold text-sm">{{ metrics.bigO_despues }}</span>
      </div>
    </div>

    <!-- Tarjeta SOLID -->
    <div class="p-3 bg-[#040914] border border-[#132a4a] rounded-lg">
      <div class="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
        <span>SALUD SOLID</span>
        <span>📐</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-amber-400">{{ metrics.solid_antes }}/100</span>
        <span class="text-slate-500">→</span>
        <span class="text-emerald-400 font-bold text-sm">{{ metrics.solid_despues }}/100</span>
      </div>
    </div>

    <!-- Tarjeta Seguridad OWASP -->
    <div class="p-3 bg-[#040914] border border-[#132a4a] rounded-lg">
      <div class="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
        <span>SEGURIDAD OWASP</span>
        <span>🛡️</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-rose-400">{{ metrics.seguridad_antes }}</span>
        <span class="text-slate-500">→</span>
        <span class="text-[#00ffaa] font-bold text-sm">{{ metrics.seguridad_despues }}</span>
      </div>
    </div>
  </div>
</template>
