<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
const paths: Record<string, string> = {
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z M8 12l3 3 5-6',
  chat: 'M21 11a8 8 0 0 1-8 8H5l-3 3V11a8 8 0 0 1 8-8h3a8 8 0 0 1 8 8Z M7 9h10 M7 13h6',
  plus: 'M12 5v14 M5 12h14',
  close: 'm6 6 12 12 M18 6 6 18',
  arrow: 'm5 12 14 0 M13 6l6 6-6 6',
  send: 'm22 2-7 20-4-9-9-4 20-7Z M22 2 11 13',
  history: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2',
  code: 'm8 6-6 6 6 6 M16 6l6 6-6 6 M14 3 10 21',
  document: 'M14 2H5v20h14V7l-5-5Z M14 2v6h5 M8 12h8 M8 16h6',
  layers: 'm12 3-10 6 10 6 10-6-10-6Z M2 14l10 6 10-6 M2 19l10 6 10-6',
  key: 'M15 3a6 6 0 1 1-4 10L4 20H1v-3l8-8a6 6 0 0 1 6-6Z M17 6h.01',
  terminal: 'm5 6 6 6-6 6 M13 18h6',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
  sound: 'M11 4 6 8H2v8h4l5 4V4Z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14',
  mute: 'M11 4 6 8H2v8h4l5 4V4Z M16 9l6 6 M22 9l-6 6',
  mic: 'M9 3a3 3 0 0 1 6 0v9a3 3 0 0 1-6 0V3Z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8',
  image: 'M3 3h18v18H3V3Z m0 14 5-5 5 5 3-3 5 5 M15 7h.01',
  clip: 'm8 13 7-7a4 4 0 0 1 6 6L10 23a6 6 0 0 1-8-8L13 4 M6 17 17 6',
  refresh: 'M20 7a9 9 0 1 0 1 9 M20 2v6h-6',
  download: 'M12 3v12 M7 10l5 5 5-5 M3 16v5h18v-5',
  chevron: 'm9 5 7 7-7 7',
  chevronDown: 'm6 9 6 6 6-6',
  play: 'm8 4 12 8-12 8V4Z',
  pause: 'M8 4v16 M16 4v16',
  rotate: 'M3 10a9 9 0 1 1 2 8 M3 4v6h6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  spark: 'm12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
  check: 'm5 12 4 4L19 6',
  external: 'M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7',
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.spark" />
  </svg>
</template>
