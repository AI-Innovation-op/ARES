/**
 * @fileoverview Adaptador nativo SQLite para A.R.E.S. v2.6.
 * Utiliza node:sqlite de Node.js 24+ sin librerías externas ni compilación C++.
 * Proporciona persistencia local instantánea de memoria total.
 * @module config/sqlite
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance: DatabaseSync | null = null;
let dbFilePath: string = '';

/**
 * Normaliza una fila obtenida de SQLite para que coincida con los tipos de dominio:
 * - Convierte 0/1 a booleanos para columnas terminadas en _enabled o _triggered.
 * - Deserializa cadenas JSON para campos estructurados (sources, preferred_stacks, etc.).
 * - Convierte cadenas ISO en objetos Date para columnas de fecha (*_at).
 */
export function normalizarFila<T>(fila: unknown): T {
  if (!fila || typeof fila !== 'object') {
    return fila as T;
  }

  const obj = { ...(fila as Record<string, unknown>) };

  for (const [clave, valor] of Object.entries(obj)) {
    if (typeof valor === 'number' && (clave.endsWith('_enabled') || clave.endsWith('_triggered'))) {
      obj[clave] = Boolean(valor);
    } else if (typeof valor === 'string') {
      if (
        (clave === 'sources' ||
          clave === 'preferred_stacks' ||
          clave === 'vulnerabilities_found' ||
          clave === 'metadata') &&
        (valor.startsWith('[') || valor.startsWith('{'))
      ) {
        try {
          obj[clave] = JSON.parse(valor);
        } catch {
          // Mantener valor crudo si falla el parseo
        }
      } else if (clave.endsWith('_at') && !isNaN(Date.parse(valor))) {
        obj[clave] = new Date(valor);
      }
    }
  }

  return obj as T;
}

/**
 * Obtiene la ruta del archivo de base de datos SQLite.
 */
export function obtenerRutaDB(): string {
  if (process.env['SQLITE_DB_PATH']) {
    return path.resolve(process.env['SQLITE_DB_PATH']);
  }
  // Por defecto en la carpeta database en la raíz de ares-ecosystem
  const rutaDefault = path.resolve(process.cwd(), '../database/ares.db');
  return rutaDefault;
}

/**
 * Inicializa la base de datos SQLite embebida y aplica las tablas si no existen.
 */
export function inicializarSqlite(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  dbFilePath = obtenerRutaDB();
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`🛡️  [SQLite] Abriendo base de datos local en: ${dbFilePath}`);
  dbInstance = new DatabaseSync(dbFilePath);

  // Registrar funciones nativas equivalentes a PostgreSQL
  dbInstance.function('gen_random_uuid', () => crypto.randomUUID());
  dbInstance.function('NOW', () => new Date().toISOString());

  // Habilitar claves foráneas y modo WAL para máximo rendimiento concurrente
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA journal_mode = WAL;');

  // Aplicar esquema DDL inicial
  ejecutarEsquemaInicial(dbInstance);

  return dbInstance;
}

/**
 * Ejecuta el esquema DDL de tablas tácticas si no existen aún.
 */
function ejecutarEsquemaInicial(db: DatabaseSync): void {
  const ddl = `
    CREATE TABLE IF NOT EXISTS commanders (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      alias TEXT NOT NULL DEFAULT 'Comandante',
      preferred_stacks TEXT NOT NULL DEFAULT '["TypeScript", "Node.js", "Vue.js", "PostgreSQL", "TailwindCSS"]',
      coding_conventions TEXT,
      locale TEXT NOT NULL DEFAULT 'es-PE',
      voice_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      commander_id TEXT NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      repo_url TEXT,
      architecture_pattern TEXT NOT NULL DEFAULT 'Clean + Hexagonal',
      doc_coverage_score REAL NOT NULL DEFAULT 0.00,
      solid_health_score REAL NOT NULL DEFAULT 0.00,
      last_synced_commit TEXT,
      created_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE TABLE IF NOT EXISTS technical_documents (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      adr_number INTEGER,
      title TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0.0',
      markdown_content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL DEFAULT (NOW()),
      updated_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_adr_number
      ON technical_documents (repository_id, adr_number) WHERE doc_type = 'ADR';

    CREATE TABLE IF NOT EXISTS code_audits (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      original_complexity TEXT,
      optimized_complexity TEXT,
      solid_score_before INTEGER,
      solid_score_after INTEGER,
      security_before TEXT,
      security_after TEXT,
      vulnerabilities_found TEXT NOT NULL DEFAULT '[]',
      refactored_code TEXT NOT NULL,
      audited_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      commander_id TEXT NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
      title TEXT,
      created_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT NOT NULL DEFAULT '[]',
      pose_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS knowledge_embeddings (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      file_path TEXT,
      chunk_text TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      embedding TEXT,
      created_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE TABLE IF NOT EXISTS bio_telemetry_logs (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      commander_id TEXT NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
      continuous_coding_minutes INTEGER NOT NULL DEFAULT 0,
      hydration_level_pct INTEGER,
      stamina_pct INTEGER,
      detected_fatigue_level TEXT,
      spartan_intervention_triggered INTEGER NOT NULL DEFAULT 0,
      logged_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE TABLE IF NOT EXISTS agent_state_events (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      commander_id TEXT NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
      stance TEXT NOT NULL,
      pose_number INTEGER NOT NULL,
      trigger_source TEXT NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE TABLE IF NOT EXISTS architectural_memories (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      collection TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      embedding TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (NOW()),
      updated_at TEXT NOT NULL DEFAULT (NOW())
    );

    CREATE INDEX IF NOT EXISTS idx_memories_collection ON architectural_memories (collection);
  `;

  db.exec(ddl);
}

/**
 * Ejecuta una consulta SQL tipada contra SQLite.
 * Convierte automáticamente sintaxis de parámetros posicionales ($1, $2) a (?)
 * y sanea valores `undefined` a `null`.
 */
export function consultaSqlite<T>(
  textoSql: string,
  parametros?: unknown[]
): { rows: T[] } {
  const db = inicializarSqlite();

  // Convertir $1, $2... a ?
  const sqlConvertido = textoSql.replace(/\$\d+/g, '?');

  // Saneamiento de parámetros: undefined -> null, booleanos a 1/0, objetos a JSON
  const paramsSaneados = (parametros ?? []).map((val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'object' && !(val instanceof Uint8Array)) {
      return JSON.stringify(val);
    }
    return val;
  });

  const stmt = db.prepare(sqlConvertido);

  // Comprobar si la consulta produce filas
  // (SELECT o cualquier INSERT/UPDATE/DELETE con RETURNING)
  const esConsultaConFilas =
    /^\s*(SELECT|WITH)\b/i.test(sqlConvertido) || /\bRETURNING\b/i.test(sqlConvertido);

  if (esConsultaConFilas) {
    const rawRows = (stmt.all as any)(...paramsSaneados);
    const rows = rawRows.map((r: any) => normalizarFila<T>(r));
    return { rows };
  } else {
    (stmt.run as any)(...paramsSaneados);
    return { rows: [] as T[] };
  }
}

/**
 * Verifica la disponibilidad del motor SQLite.
 */
export async function verificarConexionSqlite(): Promise<void> {
  const db = inicializarSqlite();
  const stmt = db.prepare('SELECT NOW() AS hora_servidor, 1 AS activo');
  const resultado = stmt.get() as { hora_servidor: string; activo: number };
  console.log(`🛡️  [SQLite] Base de datos activa y sincronizada en ${dbFilePath}`);
  console.log(`    Timestamp del motor: ${resultado.hora_servidor}`);
}

/**
 * Cierra la base de datos si estuviera abierta.
 */
export function cerrarSqlite(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
      console.log('🛡️  [SQLite] Conexión cerrada de forma ordenada.');
    } catch (e) {
      console.error('Error cerrando SQLite:', e);
    } finally {
      dbInstance = null;
    }
  }
}
