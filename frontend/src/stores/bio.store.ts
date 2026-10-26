/**
 * @fileoverview Store de Pinia para el Protocolo Bio-Armadura (Bienestar del Comandante).
 * Monitorea hidratación, estamina, temporizador de sesión y sprint táctico Pomodoro.
 * Persiste y recupera la telemetría en SQLite mediante la API de A.R.E.S.
 * @module stores/bio.store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useFsmStore } from './fsm.store.js';
import { apiService } from '../services/api.service.js';

export const useBioStore = defineStore('bio', () => {
  const fsm = useFsmStore();

  const aguaPct = ref(80);
  const segundosSesion = ref(0);
  const segundosSprint = ref(25 * 60); // 25 minutos
  const sprintActivo = ref(false);
  const penalizacionFatiga = ref(0);
  const bonoDescanso = ref(0);
  const sprintsCompletados = ref(0);
  const alertaActiva = ref<string | null>(null);

  // Minutos transcurridos en la sesión
  const minutosSesion = computed(() => Math.floor(segundosSesion.value / 60));

  // Cálculo de Estamina según Ficha Técnica v2.6:
  // 100 - (minutos * 0.18) - (100 - agua) * 0.3 - penalización + bono
  const estaminaPct = computed(() => {
    const desgasteSesion = minutosSesion.value * 0.18;
    const desgasteHidratacion = (100 - aguaPct.value) * 0.3;
    const total = 100 - desgasteSesion - desgasteHidratacion - penalizacionFatiga.value + bonoDescanso.value;
    return Math.max(5, Math.min(100, Math.round(total)));
  });

  // Color del semáforo de estamina
  const colorEstamina = computed(() => {
    if (estaminaPct.value >= 70) return 'text-emerald-400';
    if (estaminaPct.value >= 40) return 'text-amber-400';
    return 'text-rose-500';
  });

  // Formato HH:MM:SS de la sesión
  const tiempoSesionFormateado = computed(() => {
    const h = Math.floor(segundosSesion.value / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundosSesion.value % 3600) / 60).toString().padStart(2, '0');
    const s = (segundosSesion.value % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  });

  // Formato MM:SS del Pomodoro
  const tiempoSprintFormateado = computed(() => {
    const m = Math.floor(segundosSprint.value / 60).toString().padStart(2, '0');
    const s = (segundosSprint.value % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  /**
   * Carga la última telemetría biométrica guardada en SQLite para preservar estado.
   */
  async function cargarUltimaTelemetria() {
    try {
      const telemetria = await apiService.obtenerUltimaTelemetria('default');
      if (telemetria) {
        if (typeof telemetria.continuous_coding_minutes === 'number') {
          segundosSesion.value = telemetria.continuous_coding_minutes * 60;
        }
        if (typeof telemetria.hydration_level_pct === 'number') {
          aguaPct.value = telemetria.hydration_level_pct;
        }
        console.log('🛡️ [BioStore] Telemetría restaurada desde SQLite:', telemetria);
      }
    } catch (err) {
      console.warn('⚠️ [BioStore] No se pudo restaurar telemetría previa:', err);
    }
  }

  // Cargar telemetría al inicializar store
  cargarUltimaTelemetria();

  /**
   * Sincroniza la telemetría actual con la base de datos SQLite.
   */
  async function sincronizarTelemetria() {
    try {
      await apiService.consultarBio({
        minutos: minutosSesion.value,
        agua: Math.round(aguaPct.value),
        penalizacion: penalizacionFatiga.value,
        bono: bonoDescanso.value,
      });
    } catch (err) {
      // Sincronización silenciosa en segundo plano
    }
  }

  // Bucle de temporizadores (cada segundo)
  setInterval(() => {
    segundosSesion.value++;

    // Desgaste de hidratación: 0.8 puntos por minuto (0.8 / 60 por segundo)
    if (aguaPct.value > 0) {
      aguaPct.value = Math.max(0, +(aguaPct.value - (0.8 / 60)).toFixed(2));
    }

    // Sprint Pomodoro
    if (sprintActivo.value) {
      if (segundosSprint.value > 0) {
        segundosSprint.value--;
      } else {
        // Sprint finalizado
        sprintActivo.value = false;
        segundosSprint.value = 25 * 60;
        sprintsCompletados.value++;
        bonoDescanso.value = Math.min(30, bonoDescanso.value + 8);
        fsm.cambiarPostura('VICTORY', 4);
        alertaActiva.value = '🎉 ¡Sprint táctico de 25m completado! A.R.E.S. te ordena una pausa activa de 5 minutos.';
        sincronizarTelemetria();
      }
    }

    // Evaluaciones automáticas y sincronización cada 30 segundos
    if (segundosSesion.value % 30 === 0) {
      sincronizarTelemetria();

      if (estaminaPct.value < 40 && !alertaActiva.value) {
        fsm.cambiarPostura('SHIELD', 14);
        alertaActiva.value = '⚔️ [REGAÑO TÁCTICO] Estamina por debajo del 40%. Aplica la regla 20-20-20 y bebe agua.';
      } else if (aguaPct.value < 25 && !alertaActiva.value) {
        alertaActiva.value = '💧 [RECORDATORIO] Reserva de agua baja (< 25%). Presiona +Hidratar.';
      }
    }
  }, 1000);

  function hidratar() {
    aguaPct.value = Math.min(100, Math.round(aguaPct.value + 20));
    sincronizarTelemetria();
  }

  function toggleSprint() {
    sprintActivo.value = !sprintActivo.value;
    if (sprintActivo.value) {
      fsm.cambiarPostura('SPRINT', 6);
    }
    sincronizarTelemetria();
  }

  function reiniciarSprint() {
    sprintActivo.value = false;
    segundosSprint.value = 25 * 60;
  }

  function descartarAlerta() {
    alertaActiva.value = null;
  }

  return {
    aguaPct,
    estaminaPct,
    colorEstamina,
    segundosSesion,
    tiempoSesionFormateado,
    segundosSprint,
    tiempoSprintFormateado,
    sprintActivo,
    alertaActiva,
    sprintsCompletados,
    hidratar,
    toggleSprint,
    reiniciarSprint,
    descartarAlerta,
    cargarUltimaTelemetria,
  };
});
