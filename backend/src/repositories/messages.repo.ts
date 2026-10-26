/**
 * @fileoverview Repositorio para la tabla messages.
 * Guarda y recupera turnos de conversación de la consola.
 * @module repositories/messages.repo
 */

import { consulta } from '../config/db.js';
import type { Mensaje, NumeroPose } from '../types/ares.types.js';

/**
 * Guarda un mensaje en el historial de la conversación.
 */
export async function guardarMensaje(
  conversationId: string,
  role: 'user' | 'model',
  content: string,
  sources: Array<{ uri: string; title: string }> = [],
  poseNumber: NumeroPose | null = null
): Promise<Mensaje> {
  const { rows } = await consulta<Mensaje>(
    `INSERT INTO messages (conversation_id, role, content, sources, pose_number)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [conversationId, role, content, JSON.stringify(sources), poseNumber]
  );
  return rows[0];
}

/**
 * Obtiene los últimos mensajes de una conversación para alimentar el contexto a Gemini.
 * Devuelve en orden cronológico ascendente (el más antiguo primero).
 */
export async function obtenerUltimosMensajes(
  conversationId: string,
  limite: number = 16
): Promise<Mensaje[]> {
  const { rows } = await consulta<Mensaje>(
    `SELECT * FROM (
       SELECT * FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) sub
     ORDER BY created_at ASC`,
    [conversationId, limite]
  );
  return rows;
}
