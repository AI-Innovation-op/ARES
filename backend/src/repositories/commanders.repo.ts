/**
 * @fileoverview Repositorio para operaciones con la tabla commanders.
 * @module repositories/commanders.repo
 */

import { consulta } from '../config/db.js';
import type { Comandante } from '../types/ares.types.js';

/**
 * Obtiene un comandante por su identificador UUID.
 */
export async function obtenerComandantePorId(id: string): Promise<Comandante | null> {
  const { rows } = await consulta<Comandante>(
    'SELECT * FROM commanders WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Obtiene el comandante principal por defecto o lo crea si la tabla está vacía.
 */
export async function obtenerOCrearComandantePorDefecto(): Promise<Comandante> {
  const { rows } = await consulta<Comandante>(
    'SELECT * FROM commanders ORDER BY created_at ASC LIMIT 1'
  );

  if (rows[0]) {
    return rows[0];
  }

  const { rows: nuevo } = await consulta<Comandante>(
    `INSERT INTO commanders (alias, preferred_stacks, locale, voice_enabled)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      'Comandante Kevin',
      JSON.stringify(['TypeScript', 'Node.js', 'Vue.js', 'PostgreSQL', 'TailwindCSS']),
      'es-PE',
      true,
    ]
  );

  return nuevo[0];
}
