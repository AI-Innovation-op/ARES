<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useFsmStore } from '../../stores/fsm.store.js';
import { crearAvatarVoxel, type VoxelAvatarController } from '../../composables/useVoxelAvatar.js';

const fsm = useFsmStore();
const contenedor = ref<HTMLDivElement | null>(null);
let controlador: VoxelAvatarController | null = null;

onMounted(() => {
  if (contenedor.value) {
    controlador = crearAvatarVoxel(contenedor.value);
    // Aplicar pose inicial
    controlador.actualizarPose(
      fsm.poseActual.id,
      fsm.poseActual.action3d,
      fsm.poseActual.eyes,
      fsm.poseActual.shield
    );
  }
});

watch(
  () => [fsm.poseActual.id, fsm.poseActual.action3d, fsm.poseActual.eyes, fsm.poseActual.shield],
  () => {
    if (controlador) {
      controlador.actualizarPose(
        fsm.poseActual.id,
        fsm.poseActual.action3d,
        fsm.poseActual.eyes,
        fsm.poseActual.shield
      );
    }
  }
);

function handleDblClick() {
  if (controlador) {
    controlador.resetRotacion();
  }
}

onUnmounted(() => {
  if (controlador) {
    controlador.destruir();
    controlador = null;
  }
});
</script>

<template>
  <div
    ref="contenedor"
    class="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
    @dblclick="handleDblClick"
    title="Arrastra para rotar en 360° | Doble clic para restablecer vista"
  >
    <!-- Overlay de control táctico -->
    <div class="absolute bottom-3 left-3 bg-[#091326]/80 border border-[#132a4a] rounded px-2.5 py-1 text-xs font-mono text-cyan-400 pointer-events-none flex items-center gap-1.5 shadow">
      <span class="w-2 h-2 rounded-full bg-[#00ffaa] animate-pulse"></span>
      3D VOXEL // THREE.JS
    </div>
  </div>
</template>
