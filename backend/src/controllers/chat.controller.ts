/**
 * @fileoverview Controlador del endpoint POST /api/chat.
 * @module controllers/chat.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { procesarMensajeChat, procesarMensajeChatStream } from '../services/chat.service.js';
import { ValidationError, mensajePublico } from '../middleware/error.middleware.js';
import type { ChatRequest } from '../types/api.types.js';

export async function chatHandler(
  req: Request<unknown, unknown, ChatRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { message, conversationId, imageBase64, commanderId, provider, model, tacticalMode } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new ValidationError('El campo "message" es obligatorio y no puede estar vacío.');
    }

    const respuesta = await procesarMensajeChat({
      message: message.trim(),
      conversationId,
      imageBase64,
      commanderId,
      provider,
      model,
      tacticalMode,
    });

    res.status(200).json(respuesta);
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint de streaming mediante Server-Sent Events (SSE).
 * Emite eventos: 'init', 'chunk', y 'done'.
 */
export async function chatStreamHandler(
  req: Request<unknown, unknown, ChatRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { message, conversationId, imageBase64, commanderId, provider, model, tacticalMode } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new ValidationError('El campo "message" es obligatorio y no puede estar vacío.');
    }

    // Cabeceras HTTP para Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const stream = procesarMensajeChatStream({
      message: message.trim(),
      conversationId,
      imageBase64,
      commanderId,
      provider,
      model,
      tacticalMode,
    });

    for await (const evento of stream) {
      res.write(`data: ${JSON.stringify(evento)}\n\n`);
    }

    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      next(error);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: mensajePublico(error) })}\n\n`);
      res.end();
    }
  }
}
