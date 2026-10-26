/**
 * @fileoverview Repositorio para la tabla conversations.
 * @module repositories/conversations.repo
 */

import { consulta } from '../config/db.js';
import type { Conversacion } from '../types/ares.types.js';

/**
 * Crea una nueva conversación táctica para un comandante.
 */
export async function crearConversacion(
  commanderId: string,
  titulo: string = 'Sesión Táctica A.R.E.S.'
): Promise<Conversacion> {
  const { rows } = await consulta<Conversacion>(
    `INSERT INTO conversations (commander_id, title)
     VALUES ($1, $2)
     RETURNING *`,
    [commanderId, titulo]
  );
  return rows[0];
}

/**
 * Obtiene una conversación por ID.
 */
export async function obtenerConversacionPorId(id: string): Promise<Conversacion | null> {
  const { rows } = await consulta<Conversacion>(
    'SELECT * FROM conversations WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Lista las conversaciones más recientes de un comandante.
 */
export async function listarConversacionesPorComandante(
  commanderId: string,
  limite: number = 20
): Promise<Conversacion[]> {
  const { rows } = await consulta<Conversacion>(
    `SELECT * FROM conversations 
     WHERE commander_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [commanderId, limite]
  );
  return rows;
}
