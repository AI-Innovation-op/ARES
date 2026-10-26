<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animId: number;

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function redimensionar() {
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
  }

  redimensionar();
  window.addEventListener('resize', redimensionar);

  const caracteres = '0101010101ARES01';
  const fontSize = 13;
  const columns = Math.floor(canvas.width / fontSize);
  const drops: number[] = [];

  for (let i = 0; i < columns; i++) {
    drops[i] = Math.floor(Math.random() * -50);
  }

  function dibujar() {
    if (!canvas || !ctx) return;

    // Capa semi-transparente para crear el rastro de desvanecimiento
    ctx.fillStyle = 'rgba(4, 9, 20, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = caracteres[Math.floor(Math.random() * caracteres.length)];
      
      // La cabeza del rayo es verde neón brillante (#00ffaa), el rastro es cian oscuro
      ctx.fillStyle = Math.random() > 0.85 ? '#00ffaa' : '#0284c7';
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    animId = requestAnimationFrame(dibujar);
  }

  dibujar();

  onUnmounted(() => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', redimensionar);
  });
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 w-full h-full pointer-events-none opacity-20 z-0"
  ></canvas>
</template>
