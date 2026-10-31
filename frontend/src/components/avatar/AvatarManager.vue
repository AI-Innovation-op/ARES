<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { POSES_16, useFsmStore } from '../../stores/fsm.store.js';
import type { NumeroPose } from '../../types/ares.types.js';
import AvatarCanvas3D from './AvatarCanvas3D.vue';
import AppIcon from '../common/AppIcon.vue';
import poster from '../../assets/avatar/ares-poster.png';
import staticModel from '../../assets/avatar/ares-static.glb?url';
const fsm = useFsmStore();
const canvas = ref<InstanceType<typeof AvatarCanvas3D> | null>(null);
const ready = ref(false),
  unavailable = ref(false),
  motion = ref(true),
  reduced = ref(false);
let preference: MediaQueryList | undefined;
const images = import.meta.glob('../../assets/avatar/pose-*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const image = computed(
  () =>
    (Object.entries(images).find(([name]) =>
      name.includes(`/pose-${String(fsm.poseActual.id).padStart(2, '0')}-`),
    )?.[1] as string) || poster,
);
const label = computed(
  () => `${String(fsm.poseActual.id).padStart(2, '0')} / ${fsm.poseActual.code}`,
);
const updatePreference = () => {
  reduced.value = preference?.matches ?? false;
};
onMounted(() => {
  preference = matchMedia('(prefers-reduced-motion: reduce)');
  updatePreference();
  preference.addEventListener('change', updatePreference);
});
onUnmounted(() => preference?.removeEventListener('change', updatePreference));
function fallback() {
  unavailable.value = true;
  fsm.modo3DActivo = false;
}
function selectPose(event: Event) {
  fsm.fijarPoseDirecta(Number((event.target as HTMLSelectElement).value) as NumeroPose);
}
</script>
<template>
  <section class="companion-panel" aria-label="Compañero ARES">
    <div class="companion-heading">
      <div>
        <span class="eyebrow">TU COMPAÑERO DE INGENIERÍA</span>
        <h2>A.R.E.S.<span class="live-dot" /></h2>
      </div>
      <span class="outline-badge">VOXEL CORE</span>
    </div>
    <div class="companion-stage" :data-pose="fsm.poseActual.id">
      <div class="stage-grid" aria-hidden="true" />
      <span class="stage-coordinate" aria-hidden="true">SYS / AVATAR.01</span>
      <img
        v-if="!fsm.modo3DActivo || !ready"
        :src="image"
        :alt="`ARES: ${fsm.poseActual.name}`"
        class="companion-poster"
        width="768"
        height="960"
      />
      <AvatarCanvas3D
        v-if="fsm.modo3DActivo"
        ref="canvas"
        :motion="motion && !reduced"
        @fallback="fallback"
        @ready="ready = true"
      />
      <div class="stage-caption">
        <span class="status-dot" />{{ fsm.modo3DActivo ? 'MODELO 3D ARTICULADO' : 'VISTA LIGERA' }}
      </div>
      <div v-if="fsm.modo3DActivo" class="stage-controls">
        <button
          class="icon-button"
          aria-label="Girar avatar a la izquierda"
          @click="canvas?.turn(-1)"
        >
          <AppIcon name="chevron" class="turn-left" />
        </button>
        <button
          class="icon-button"
          aria-label="Restablecer vista del avatar"
          @click="canvas?.resetView()"
        >
          <AppIcon name="rotate" />
        </button>
        <button class="icon-button" aria-label="Girar avatar a la derecha" @click="canvas?.turn(1)">
          <AppIcon name="chevron" />
        </button>
      </div>
    </div>
    <div class="companion-state">
      <span class="eyebrow">ESTADO VISUAL</span><span class="pose-code">{{ label }}</span>
      <h3>{{ fsm.poseActual.name }}</h3>
      <p>El avatar acompaña el estado de la conversación.</p>
    </div>
    <div class="companion-options">
      <label class="field-label" for="avatar-pose">Explorar las 16 poses</label>
      <select id="avatar-pose" :value="fsm.poseActual.id" @change="selectPose">
        <option v-for="pose in POSES_16" :key="pose.id" :value="pose.id">
          {{ String(pose.id).padStart(2, '0') }} · {{ pose.name }}
        </option>
      </select>
      <div class="companion-toggles">
        <button
          class="text-button"
          :aria-pressed="fsm.modo3DActivo"
          @click="
            fsm.toggleModoGrafico();
            ready = false;
          "
        >
          <AppIcon name="layers" :size="16" />{{ fsm.modo3DActivo ? 'Vista 3D' : 'Vista ligera' }}
        </button>
        <button
          class="text-button"
          :disabled="reduced || !fsm.modo3DActivo"
          :aria-pressed="motion && !reduced"
          @click="motion = !motion"
        >
          <AppIcon :name="motion && !reduced ? 'pause' : 'play'" :size="16" />{{
            reduced ? 'Movimiento reducido' : motion ? 'Pausar' : 'Animar'
          }}
        </button>
      </div>
      <p v-if="unavailable" class="helper-text" role="status">
        WebGL no está disponible. La vista ligera conserva el diseño y las 16 expresiones.
      </p>
      <p v-else class="helper-text">La vista previa de poses no ejecuta tareas.</p>
    </div>
    <div class="companion-signature">
      <AppIcon name="shield" :size="15" /><span>CREATED BY <strong>AI INNOVATION</strong></span
      ><a
        :href="staticModel"
        download="ARES-avatar-estatico.glb"
        class="icon-button avatar-download"
        aria-label="Descargar modelo estático GLB"
        title="Descargar modelo estático GLB"
        ><AppIcon name="download" :size="17"
      /></a>
    </div>
  </section>
</template>
