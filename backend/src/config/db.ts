/**
 * @fileoverview Conexión a la base de datos de A.R.E.S.
 * Soporta modo híbrido:
 * 1. SQLite embebido nativo (node:sqlite) por defecto (Opción A: Memoria Total Local).
 * 2. PostgreSQL 16+ con pgvector si se especifica DB_DRIVER=postgres.
 * Proporciona degradación elegante automática a SQLite si PostgreSQL no responde.
 * @module config/db
 */

import pg from 'pg';
import { env } from './env.js';
import {
  consultaSqlite,
  verificarConexionSqlite,
  inicializarSqlite,
} from './sqlite.js';

const { Pool } = pg;

let driverActivo: 'sqlite' | 'postgres' =
  (process.env['DB_DRIVER']?.toLowerCase() === 'postgres') ? 'postgres' : 'sqlite';

/**
 * Pool de conexiones a PostgreSQL (creado de forma perezosa).
 */
let pgPool: pg.Pool | null = null;

function obtenerPgPool(): pg.Pool {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    // Evitar que errores no capturados en el pool boten el proceso de Node
    pgPool.on('error', (err) => {
      console.warn('⚠️  [PG Pool] Evento de error asíncrono en PostgreSQL:', err.message);
    });
  }
  return pgPool;
}

/**
 * Retorna el motor de persistencia activo actualmente.
 */
export function obtenerDriverActivo(): 'sqlite' | 'postgres' {
  return driverActivo;
}

/**
 * Helper de consulta unificado y tipado para ejecutar SQL.
 * Si el driver activo es SQLite, ejecuta de forma síncrona/segura contra ares.db.
 * Si es PostgreSQL, ejecuta contra el pool de conexiones.
 *
 * @param texto - Consulta SQL parametrizada ($1, $2, ...)
 * @param parametros - Valores para los placeholders
 * @returns Objeto con propiedad `rows` conteniendo las filas tipadas
 */
export async function consulta<T extends Record<string, any> = Record<string, any>>(
  texto: string,
  parametros?: unknown[]
): Promise<{ rows: T[] }> {
  if (driverActivo === 'sqlite') {
    return consultaSqlite<T>(texto, parametros);
  }

  try {
    const pool = obtenerPgPool();
    const resultado = await pool.query<T>(texto, parametros);
    return { rows: resultado.rows };
  } catch (error: any) {
    console.warn(`⚠️  [DB] Falla en PostgreSQL (${error.message}). Conmutando a SQLite embebido...`);
    driverActivo = 'sqlite';
    return consultaSqlite<T>(texto, parametros);
  }
}

/**
 * Verifica la conexión a la base de datos al arrancar el servidor.
 */
export async function verificarConexionDB(): Promise<void> {
  if (driverActivo === 'sqlite') {
    await verificarConexionSqlite();
    return;
  }

  try {
    const pool = obtenerPgPool();
    const resultado = await pool.query('SELECT NOW() AS hora_servidor');
    const hora = resultado.rows[0]?.hora_servidor;
    console.log(`🛡️  [DB] Conexión a PostgreSQL establecida — Hora del servidor: ${hora}`);
  } catch (error) {
    console.warn('⚠️  [DB] PostgreSQL no respondió en localhost:5432.');
    console.warn('🔄 [DB] Activando motor SQLite embebido local (Persistencia y Memoria Total)...');
    driverActivo = 'sqlite';
    await verificarConexionSqlite();
  }
}

// Exportar pool para compatibilidad si fuera requerido directamente
export const pool = {
  query: async <T extends pg.QueryResultRow = any>(text: string, params?: unknown[]) => {
    return (await consulta<T>(text, params)) as any;
  },
};
