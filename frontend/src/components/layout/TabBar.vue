<script setup lang="ts">
defineProps<{
  tabActiva: number;
}>();

const emit = defineEmits<{
  (e: 'cambiarTab', tab: number): void;
}>();

const tabs = [
  { id: 1, label: 'Consola', icon: '⚔️' },
  { id: 2, label: 'Escudo Documental', icon: '🛡️' },
  { id: 3, label: 'Espada Full-Stack', icon: '⚡' },
  { id: 4, label: 'Arquitecto', icon: '🏛️' },
  { id: 5, label: 'Matriz 16 Poses', icon: '🎭' },
  { id: 6, label: 'Ficha Técnica', icon: '📋' },
];
</script>

<template>
  <nav class="flex border-b border-[#132a4a] bg-[#091326] px-2 overflow-x-auto select-none">
    <button
      v-for="t in tabs"
      :key="t.id"
      @click="emit('cambiarTab', t.id)"
      :class="[
        'px-3.5 py-2.5 text-xs font-mono font-medium flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap',
        tabActiva === t.id
          ? 'border-[#00ffaa] text-[#00ffaa] bg-[#040914]/80 shadow-sm'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700',
      ]"
    >
      <span>{{ t.icon }}</span>
      <span>{{ t.label }}</span>
    </button>
  </nav>
</template>
