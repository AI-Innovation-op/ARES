/**
 * @fileoverview Store de Pinia para la Máquina de Estados FSM (16 poses + 6 posturas).
 * Gobierna el estado visual, HUD y efectos de sonido en todo el sistema.
 * @module stores/fsm.store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Postura, NumeroPose, InfoPose } from '../types/ares.types.js';
import { useAudio } from '../composables/useAudio.js';

/**
 * Catálogo canónico de las 16 Poses de A.R.E.S. v2.6
 */
export const POSES_16: InfoPose[] = [
  { id: 1, code: 'IDLE', name: 'Centinela Documental', eyes: 'NORMAL', shield: 'DOC', action3d: 'STAND', description: 'Guardia en espera de órdenes tácticas.' },
  { id: 2, code: 'ERROR', name: 'Alerta de Excepción', eyes: 'DEAD', shield: 'CODE', action3d: 'STAND', description: 'Bug crítico, error de compilación o fallo de API.' },
  { id: 3, code: 'FOCUS', name: 'Compilación Profunda', eyes: 'SQUINT', shield: 'CREST', action3d: 'STAND', description: 'Razonamiento complejo y resolución de conflictos.' },
  { id: 4, code: 'HAPPY', name: 'Build Exitoso', eyes: 'HAPPY_SQUINT', shield: 'CREST', action3d: 'STAND', description: 'Tests en verde y cobertura completa.' },
  { id: 5, code: 'SPRINT_1', name: 'Patrulla CI/CD', eyes: 'NORMAL', shield: 'NONE', action3d: 'RUN_1', description: 'Escaneo de archivos en segundo plano.' },
  { id: 6, code: 'SPRINT', name: 'Sprint de Emergencia', eyes: 'SQUINT', shield: 'NONE', action3d: 'RUN_2', description: 'Consulta con Grounding o sprint de foco.' },
  { id: 7, code: 'SPRINT_HAPPY', name: 'Velocidad Full-Stack', eyes: 'HAPPY_SQUINT', shield: 'NONE', action3d: 'RUN_3', description: 'Scaffolding completo de proyecto nuevo.' },
  { id: 8, code: 'SPRINT_DETERMINED', name: 'Caza de Latencia', eyes: 'DETERMINED', shield: 'NONE', action3d: 'RUN_4', description: 'Optimización SQL y reducción Big-O.' },
  { id: 9, code: 'COMBAT_READY', name: 'Postura Anti-Deuda', eyes: 'ANGRY', shield: 'CODE', action3d: 'SWORD_LOW', description: 'Detección de código espagueti y vulnerabilidades.' },
  { id: 10, code: 'COMBAT_CHARGE', name: 'Carga de Refactor', eyes: 'ANGRY', shield: 'CREST', action3d: 'SWORD_HIGH', description: 'Carga de la Espada Binaria con principios SOLID.' },
  { id: 11, code: 'SLASH', name: 'Corte Anime Binario', eyes: 'SQUINT', shield: 'CREST', action3d: 'ANIME_SLASH', description: 'Tajo verde neón que refactoriza el código.' },
  { id: 12, code: 'COMBAT_GUARD', name: 'Guardia Post-Corte', eyes: 'DETERMINED', shield: 'CREST', action3d: 'SWORD_GUARD', description: 'Verificación de que el refactor no tiene regresiones.' },
  { id: 13, code: 'WALL_CREST', name: 'Firewall Espartano', eyes: 'NORMAL', shield: 'CREST', action3d: 'SHIELD_WALL', description: 'Bloqueo de inyecciones SQL y fugas de secretos.' },
  { id: 14, code: 'WALL_FOCUS', name: 'Blindaje de Producción', eyes: 'SQUINT', shield: 'CREST', action3d: 'SHIELD_WALL', description: 'Protección de base de datos y Bio-Armadura.' },
  { id: 15, code: 'SHIELD', name: 'Santuario Documental', eyes: 'ARC_HAPPY', shield: 'DOC', action3d: 'SHIELD_WALL', description: 'Generación de README, ADR y contratos OpenAPI.' },
  { id: 16, code: 'VICTORY', name: 'Auditoría Perfecta', eyes: 'CYBER_SCAN', shield: 'CODE', action3d: 'SHIELD_WALL', description: 'Código y documentación sincronizados al 100%.' },
];

export const MAPA_POSTURAS: Record<Postura, { poseId: NumeroPose; label: string; sound: any }> = {
  IDLE: { poseId: 1, label: 'GUARDIA CENTINELA', sound: null },
  SLASH: { poseId: 11, label: 'CORTE BINARIO ANIME', sound: 'slash' },
  SHIELD: { poseId: 15, label: 'MURO AEGIS DOCUMENTAL', sound: 'shield' },
  SPRINT: { poseId: 6, label: 'SPRINT FULL-STACK', sound: 'sprint' },
  ERROR: { poseId: 2, label: 'ALERTA DE EXCEPCIÓN', sound: 'error' },
  VICTORY: { poseId: 16, label: 'AUDITORÍA PERFECTA', sound: 'victory' },
};

export const useFsmStore = defineStore('fsm', () => {
  const posturaActual = ref<Postura>('IDLE');
  const poseActualId = ref<NumeroPose>(1);
  const modo3DActivo = ref(true);
  const { reproducirSonido } = useAudio();

  let timerRetornoGuardia: number | null = null;

  const poseActual = computed(() => {
    return POSES_16.find((p) => p.id === poseActualId.value) ?? POSES_16[0];
  });

  const etiquetaHUD = computed(() => {
    return MAPA_POSTURAS[posturaActual.value]?.label ?? 'GUARDIA TÁCTICA';
  });

  function cambiarPostura(nuevaPostura: Postura, poseExplicita?: NumeroPose) {
    if (timerRetornoGuardia) {
      clearTimeout(timerRetornoGuardia);
      timerRetornoGuardia = null;
    }

    posturaActual.value = nuevaPostura;
    const config = MAPA_POSTURAS[nuevaPostura];
    poseActualId.value = poseExplicita ?? config.poseId;

    if (config.sound) {
      reproducirSonido(config.sound);
    }

    // Retorno automático a IDLE tras 12 segundos si es VICTORY o ERROR
    if (nuevaPostura === 'VICTORY' || nuevaPostura === 'ERROR') {
      timerRetornoGuardia = window.setTimeout(() => {
        posturaActual.value = 'IDLE';
        poseActualId.value = 1;
      }, 12_000);
    }
  }

  function fijarPoseDirecta(id: NumeroPose) {
    if (timerRetornoGuardia) {
      clearTimeout(timerRetornoGuardia);
      timerRetornoGuardia = null;
    }
    poseActualId.value = id;
    const pose = POSES_16.find((p) => p.id === id);
    if (pose) {
      // Deducir postura aproximada
      if (id === 11) posturaActual.value = 'SLASH';
      else if (id === 15 || id === 14) posturaActual.value = 'SHIELD';
      else if (id === 2) posturaActual.value = 'ERROR';
      else if (id === 16) posturaActual.value = 'VICTORY';
      else if (id >= 5 && id <= 8) posturaActual.value = 'SPRINT';
      else posturaActual.value = 'IDLE';
    }
  }

  function toggleModoGrafico() {
    modo3DActivo.value = !modo3DActivo.value;
  }

  return {
    posturaActual,
    poseActualId,
    poseActual,
    etiquetaHUD,
    modo3DActivo,
    cambiarPostura,
    fijarPoseDirecta,
    toggleModoGrafico,
  };
});
