/**
 * @fileoverview Repositorio para la gestión de repositorios protegidos por A.R.E.S.
 * @module repositories/repositories.repo
 */

import { consulta } from '../config/db.js';
import type { Repositorio } from '../types/ares.types.js';

/**
 * Obtiene el repositorio principal por defecto o lo crea si la tabla está vacía.
 */
export async function obtenerOCrearRepositorioPorDefecto(commanderId: string): Promise<Repositorio> {
  const { rows } = await consulta<Repositorio>(
    'SELECT * FROM repositories WHERE commander_id = $1 ORDER BY created_at ASC LIMIT 1',
    [commanderId]
  );

  if (rows[0]) {
    return rows[0];
  }

  const { rows: nuevo } = await consulta<Repositorio>(
    `INSERT INTO repositories (commander_id, name, repo_url, architecture_pattern, doc_coverage_score, solid_health_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      commanderId,
      'A.R.E.S. Core V2.6',
      'https://github.com/ares/ecosystem',
      'Clean + Hexagonal',
      85.0,
      90.0,
    ]
  );

  return nuevo[0];
}

/**
 * Obtiene un repositorio por ID.
 */
export async function obtenerRepositorioPorId(id: string): Promise<Repositorio | null> {
  const { rows } = await consulta<Repositorio>(
    'SELECT * FROM repositories WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Lista todos los repositorios de un comandante.
 */
export async function listarRepositoriosPorComandante(commanderId: string): Promise<Repositorio[]> {
  const { rows } = await consulta<Repositorio>(
    'SELECT * FROM repositories WHERE commander_id = $1 ORDER BY created_at DESC',
    [commanderId]
  );
  return rows;
}
