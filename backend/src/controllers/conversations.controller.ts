/**
 * @fileoverview Controlador para la gestión de sesiones de chat táctico (Persistencia y Memoria).
 * Permite listar sesiones previas, cargar mensajes de una sesión y crear nuevas conversaciones.
 * @module controllers/conversations.controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  listarConversacionesPorComandante,
  obtenerConversacionPorId,
  crearConversacion,
} from '../repositories/conversations.repo.js';
import { obtenerUltimosMensajes } from '../repositories/messages.repo.js';
import { obtenerOCrearComandantePorDefecto } from '../repositories/commanders.repo.js';
import { consulta } from '../config/db.js';

/**
 * Lista las conversaciones recientes del comandante.
 */
export async function listarConversacionesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const commanderId = (req.query.commanderId as string) || (await obtenerOCrearComandantePorDefecto()).id;
    const limite = parseInt((req.query.limite as string) || '30', 10);

    const conversaciones = await listarConversacionesPorComandante(commanderId, limite);
    res.status(200).json({ conversaciones });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtiene el historial de mensajes de una conversación específica.
 */
export async function obtenerMensajesConversacionHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const limite = parseInt((req.query.limite as string) || '50', 10);

    const conversacion = await obtenerConversacionPorId(id);
    if (!conversacion) {
      res.status(404).json({ error: `Conversación con ID ${id} no encontrada.` });
      return;
    }

    const mensajes = await obtenerUltimosMensajes(id, limite);
    res.status(200).json({ conversacion, mensajes });
  } catch (error) {
    next(error);
  }
}

/**
 * Crea una nueva conversación táctica.
 */
export async function crearConversacionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, commanderId } = req.body;
    const cmdId = commanderId || (await obtenerOCrearComandantePorDefecto()).id;
    const titulo = title || `Misión Táctica ${new Date().toLocaleDateString('es-PE')}`;

    const conversacion = await crearConversacion(cmdId, titulo);
    res.status(201).json({ conversacion });
  } catch (error) {
    next(error);
  }
}

/**
 * Elimina una conversación y sus mensajes asociados.
 */
export async function eliminarConversacionHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    await consulta('DELETE FROM conversations WHERE id = $1', [id]);
    res.status(200).json({ status: 'OK', message: 'Conversación eliminada exitosamente.' });
  } catch (error) {
    next(error);
  }
}
