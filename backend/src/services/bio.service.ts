/**
 * @fileoverview Servicio del Protocolo Bio-Armadura (Bienestar del Comandante).
 * Monitorea hidratación, minutos de sesión, estamina y fatiga según la ficha técnica v2.6.
 * @module services/bio.service
 */

import { registrarTelemetriaBio } from '../repositories/bio.repo.js';
import type { NivelFatiga } from '../types/ares.types.js';

/** Estado biométrico en memoria */
export interface EstadoBio {
  aguaPct: number;
  minutosSesion: number;
  estaminaPct: number;
  penalizacionFatiga: number;
  bonoDescanso: number;
  sprintsCompletados: number;
  nivelFatiga: NivelFatiga;
  requiereIntervencion: boolean;
  mensajeIntervencion: string | null;
}

/**
 * Calcula la estamina según la fórmula matemática exacta de A.R.E.S. v2.6:
 * Estamina = 100 - (minutos * 0.18) - (100 - agua) * 0.3 - penalización + bono
 * Rango acotado estrictamente entre 5% y 100%.
 */
export function calcularEstamina(params: {
  minutosSesion: number;
  aguaPct: number;
  penalizacionFatiga: number;
  bonoDescanso: number;
}): number {
  const { minutosSesion, aguaPct, penalizacionFatiga, bonoDescanso } = params;

  const desgasteSesion = minutosSesion * 0.18;
  const desgasteHidratacion = (100 - aguaPct) * 0.3;

  const valorCalculado = 100 - desgasteSesion - desgasteHidratacion - penalizacionFatiga + bonoDescanso;
  const estaminaRedondeada = Math.round(valorCalculado);

  return Math.max(5, Math.min(100, estaminaRedondeada));
}

/**
 * Determina el nivel de fatiga según los parámetros acumulados.
 */
export function determinarNivelFatiga(estamina: number, minutos: number): NivelFatiga {
  if (estamina < 30 || minutos >= 300) {
    return 'CRITICAL_BURNOUT';
  }
  if (estamina < 50 || minutos >= 180) {
    return 'HIGH';
  }
  if (estamina < 75 || minutos >= 90) {
    return 'MODERATE';
  }
  return 'OPTIMAL';
}

/**
 * Evalúa y genera el estado biométrico del comandante.
 */
export async function evaluarEstadoBio(params: {
  commanderId: string;
  minutosSesion: number;
  aguaPct: number;
  penalizacionFatiga?: number;
  bonoDescanso?: number;
  sprintsCompletados?: number;
}): Promise<EstadoBio> {
  const {
    commanderId,
    minutosSesion,
    aguaPct,
    penalizacionFatiga = 0,
    bonoDescanso = 0,
    sprintsCompletados = 0,
  } = params;

  const estamina = calcularEstamina({
    minutosSesion,
    aguaPct,
    penalizacionFatiga,
    bonoDescanso,
  });

  const nivelFatiga = determinarNivelFatiga(estamina, minutosSesion);

  let requiereIntervencion = false;
  let mensajeIntervencion: string | null = null;

  if (estamina < 40) {
    requiereIntervencion = true;
    mensajeIntervencion =
      '⚔️ [REGAÑO TÁCTICO ESPARTANO] ¡Alto, Comandante! Tu estamina cayó por debajo del 40%. Ningún despliegue vale tu salud. Ejecuta git commit o git stash, toma un vaso de agua y aplica la regla 20-20-20.';
  } else if (aguaPct < 25) {
    requiereIntervencion = true;
    mensajeIntervencion =
      '💧 [RECORDATORIO TÁCTICO] Reserva de hidratación crítica (< 25%). Bebe un vaso de agua de inmediato para mantener tu agudeza mental.';
  }

  // Registrar en telemetría de BD
  try {
    await registrarTelemetriaBio({
      commanderId,
      continuousCodingMinutes: minutosSesion,
      hydrationLevelPct: aguaPct,
      staminaPct: estamina,
      detectedFatigueLevel: nivelFatiga,
      spartanInterventionTriggered: requiereIntervencion,
    });
  } catch (err) {
    console.warn('⚠️ [BioService] No se pudo guardar telemetría en BD:', err);
  }

  return {
    aguaPct,
    minutosSesion,
    estaminaPct: estamina,
    penalizacionFatiga,
    bonoDescanso,
    sprintsCompletados,
    nivelFatiga,
    requiereIntervencion,
    mensajeIntervencion,
  };
}
