/**
 * @fileoverview Repositorio para la telemetría del Protocolo Bio-Armadura.
 * @module repositories/bio.repo
 */

import { consulta } from '../config/db.js';
import type { TelemetriaBio, NivelFatiga } from '../types/ares.types.js';

/**
 * Registra una instantánea de telemetría biométrica del desarrollador.
 */
export async function registrarTelemetriaBio(params: {
  commanderId: string;
  continuousCodingMinutes: number;
  hydrationLevelPct: number;
  staminaPct: number;
  detectedFatigueLevel: NivelFatiga;
  spartanInterventionTriggered: boolean;
}): Promise<TelemetriaBio> {
  const {
    commanderId,
    continuousCodingMinutes,
    hydrationLevelPct,
    staminaPct,
    detectedFatigueLevel,
    spartanInterventionTriggered,
  } = params;

  const { rows } = await consulta<TelemetriaBio>(
    `INSERT INTO bio_telemetry_logs (
       commander_id, continuous_coding_minutes, hydration_level_pct,
       stamina_pct, detected_fatigue_level, spartan_intervention_triggered
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      commanderId,
      continuousCodingMinutes,
      hydrationLevelPct,
      staminaPct,
      detectedFatigueLevel,
      spartanInterventionTriggered,
    ]
  );

  return rows[0];
}

/**
 * Obtiene el último registro de telemetría biométrica de un comandante.
 */
export async function obtenerUltimaTelemetria(commanderId: string): Promise<TelemetriaBio | null> {
  const { rows } = await consulta<TelemetriaBio>(
    `SELECT * FROM bio_telemetry_logs 
     WHERE commander_id = $1 
     ORDER BY logged_at DESC 
     LIMIT 1`,
    [commanderId]
  );
  return rows[0] ?? null;
}
