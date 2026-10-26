<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useFsmStore } from '../../stores/fsm.store.js';

const fsm = useFsmStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let animId: number;

function dibujar2D(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 + 10;

  // Sombra base
  ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 60, 45, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const respiracion = Math.sin(frame * 0.05) * 3;

  // Capa Matrix posterior
  ctx.fillStyle = '#00f2fe';
  ctx.fillRect(cx - 24, cy - 20 + respiracion, 48, 55);

  // Cuerpo / Pechera
  ctx.fillStyle = '#10b981';
  ctx.fillRect(cx - 20, cy - 20 + respiracion, 40, 42);

  // Núcleo Neón
  ctx.fillStyle = '#00ffaa';
  ctx.fillRect(cx - 6, cy - 10 + respiracion, 12, 12);

  // Cabeza / Casco
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(cx - 22, cy - 56 + respiracion, 44, 34);

  // Cresta Espartana
  ctx.fillStyle = '#00ffaa';
  ctx.fillRect(cx - 4, cy - 72 + respiracion, 8, 16);

  // Pantalla del rostro
  ctx.fillStyle = '#040914';
  ctx.fillRect(cx - 18, cy - 50 + respiracion, 36, 24);

  // Ojos según preset
  const ojos = fsm.poseActual.eyes;
  if (ojos === 'DEAD') {
    ctx.fillStyle = '#f43f5e';
    ctx.font = '10px monospace';
    ctx.fillText('X  X', cx - 11, cy - 34 + respiracion);
  } else if (ojos === 'SQUINT') {
    ctx.fillStyle = '#00ffaa';
    ctx.font = '10px monospace';
    ctx.fillText('>  <', cx - 11, cy - 34 + respiracion);
  } else if (ojos === 'ARC_HAPPY') {
    ctx.fillStyle = '#7dffd9';
    ctx.font = '10px monospace';
    ctx.fillText('^  ^', cx - 11, cy - 34 + respiracion);
  } else if (ojos === 'CYBER_SCAN') {
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(cx - 14, cy - 39 + respiracion, 28, 6);
  } else {
    // Normal: [| |]
    ctx.fillStyle = '#00ffaa';
    ctx.fillRect(cx - 10, cy - 42 + respiracion, 4, 10);
    ctx.fillRect(cx + 6, cy - 42 + respiracion, 4, 10);
  }

  // Brazo Derecho / Espada
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(cx + 22, cy - 15 + respiracion, 10, 26);
  // Hoja Espada Binaria
  ctx.fillStyle = '#00ffaa';
  ctx.fillRect(cx + 25, cy - 45 + respiracion, 4, 30);

  // Brazo Izquierdo / Escudo
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(cx - 34, cy - 15 + respiracion, 12, 32);
  ctx.strokeStyle = '#00ffaa';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 34, cy - 15 + respiracion, 12, 32);

  // Piernas
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(cx - 15, cy + 22, 10, 32);
  ctx.fillRect(cx + 5, cy + 22, 10, 32);
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let frame = 0;
  function loop() {
    frame++;
    if (canvas && ctx) {
      dibujar2D(ctx, canvas.width, canvas.height, frame);
    }
    animId = requestAnimationFrame(loop);
  }
  loop();
});

onUnmounted(() => {
  cancelAnimationFrame(animId);
});
</script>

<template>
  <div class="w-full h-full flex items-center justify-center relative select-none">
    <canvas ref="canvasRef" width="280" height="320" class="image-rendering-pixelated"></canvas>
    <div class="absolute bottom-3 left-3 bg-[#091326]/80 border border-[#132a4a] rounded px-2.5 py-1 text-xs font-mono text-emerald-400 pointer-events-none flex items-center gap-1.5 shadow">
      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
      2D PIXEL-ART // CANVAS
    </div>
  </div>
</template>

<style scoped>
.image-rendering-pixelated {
  image-rendering: pixelated;
}
</style>
