/**
 * @fileoverview Controlador para endpoints del Enjambre de Subagentes (Multi-Agent Swarm).
 * @module controllers/swarm.controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  CATALOGO_SUBAGENTES,
  ejecutarMisionEnjambre,
  ejecutarMisionEnjambreStream,
} from '../services/swarm.service.js';
import { ValidationError } from '../middleware/error.middleware.js';

/**
 * GET /api/swarm/agents
 * Devuelve el catálogo de subagentes tácticos disponibles en la legión.
 */
export function listarAgentesSwarmHandler(_req: Request, res: Response): void {
  res.status(200).json({
    swarmVersion: '3.1.0',
    totalAgents: CATALOGO_SUBAGENTES.length,
    agents: CATALOGO_SUBAGENTES,
  });
}

/**
 * POST /api/swarm/execute
 * Ejecuta una misión del enjambre de forma síncrona.
 */
export async function ejecutarSwarmHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { mission, provider, model } = req.body;

    if (!mission || typeof mission !== 'string' || mission.trim().length === 0) {
      throw new ValidationError('El campo "mission" es obligatorio para el Enjambre.');
    }

    const resultado = await ejecutarMisionEnjambre({
      mision: mission.trim(),
      provider,
      model,
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/swarm/stream
 * Ejecuta una misión del enjambre emitiendo flujo de eventos SSE en tiempo real.
 */
export async function ejecutarSwarmStreamHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { mission, provider, model } = req.body;

    if (!mission || typeof mission !== 'string' || mission.trim().length === 0) {
      throw new ValidationError('El campo "mission" es obligatorio para el Enjambre.');
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Evento de inicio con metadatos de los agentes
    res.write(
      `data: ${JSON.stringify({
        type: 'swarm_init',
        agents: CATALOGO_SUBAGENTES,
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    const stream = ejecutarMisionEnjambreStream({
      mision: mission.trim(),
      provider,
      model,
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
    }

    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        timestamp: new Date().toISOString(),
      })}\n\n`
    );
    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      next(error);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
}
