/**
 * @fileoverview Conexión a Redis mediante ioredis.
 * Usado para caché de estado del agente, bio-telemetría y sesiones.
 * Todas las claves usan el prefijo `ares:` para namespace.
 * @module config/redis
 */

import { Redis } from 'ioredis';
import { env } from './env.js';

/**
 * Cliente Redis principal del ecosistema A.R.E.S.
 * Se conecta a la URL configurada en REDIS_URL.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy(intentos: number) {
    // Si falla 2 veces, no seguir reintentando en bucle (modo degradado)
    if (intentos > 2) return null;
    return 1000;
  },
  lazyConnect: true,
});

// Silenciar errores no capturados de desconexión en desarrollo
redis.on('error', () => {});

/** Prefijo de namespace para todas las claves de A.R.E.S. en Redis */
export const PREFIJO_REDIS = 'ares:';

/**
 * Construye una clave Redis con el prefijo del ecosistema.
 * @param segmentos - Segmentos de la clave (se unen con `:`)
 * @returns Clave completa con prefijo
 *
 * @example
 * ```typescript
 * claveRedis('estado', commanderId) // → 'ares:estado:<uuid>'
 * ```
 */
export function claveRedis(...segmentos: string[]): string {
  return `${PREFIJO_REDIS}${segmentos.join(':')}`;
}

/**
 * Verifica la conexión a Redis al iniciar.
 */
export async function verificarConexionRedis(): Promise<void> {
  try {
    await redis.connect();
    await redis.ping();
    console.log('🟢 [Redis] Conexión establecida correctamente.');
  } catch (error) {
    console.error('❌ [Redis] Error al conectar con Redis:', error);
    throw error;
  }
}
