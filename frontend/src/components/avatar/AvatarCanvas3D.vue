<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useFsmStore } from '../../stores/fsm.store.js';
import { visualPose } from '../../domain/avatar-pose.js';
import type { AvatarScene } from '../../avatar/scene.js';
const props = defineProps<{ motion: boolean }>();
const emit = defineEmits<{ fallback: []; ready: [] }>();
const fsm = useFsmStore();
const host = ref<HTMLDivElement | null>(null);
let controller: AvatarScene | undefined;
let disposed = false;
onMounted(async () => {
  try {
    const { mountAvatarScene } = await import('../../avatar/scene.js');
    if (disposed || !host.value) return;
    controller = mountAvatarScene(host.value, visualPose(fsm.poseActual), () => emit('fallback'));
    controller.setMotion(props.motion);
    emit('ready');
  } catch {
    if (!disposed) emit('fallback');
  }
});
watch(
  () => fsm.poseActual,
  (pose) => controller?.setPose(visualPose(pose)),
);
watch(
  () => props.motion,
  (enabled) => controller?.setMotion(enabled),
);
onUnmounted(() => {
  disposed = true;
  controller?.dispose();
});
defineExpose({
  resetView: () => controller?.resetView(),
  turn: (direction: number) => controller?.turn(direction),
});
</script>
<template>
  <div
    ref="host"
    class="avatar-webgl"
    role="img"
    aria-label="Avatar 3D de ARES. Usa los botones de giro para cambiar la vista."
    @dblclick="controller?.resetView()"
  />
</template>
