/**
 * @fileoverview Controlador REST y SSE para el Motor de CI/CD & Despliegues Autónomos de A.R.E.S. v3.2.
 * @module controllers/cicd.controller
 */

import type { Request, Response } from 'express';
import { CicdService } from '../services/cicd.service.js';
import { mensajePublico } from '../middleware/error.middleware.js';

/**
 * Lista todas las plantillas maestras de CI/CD disponibles.
 */
export function listarTemplatesHandler(_req: Request, res: Response): void {
  const templates = CicdService.listarTemplates();
  res.json({
    total: templates.length,
    templates,
  });
}

/**
 * Obtiene una plantilla de CI/CD por su identificador.
 */
export function obtenerTemplateHandler(req: Request, res: Response): void {
  const id = String(req.params.id);
  const template = CicdService.obtenerTemplate(id);

  if (!template) {
    res.status(404).json({ error: `Plantilla CI/CD no encontrada: ${id}` });
    return;
  }

  res.json(template);
}

/**
 * Audita una especificación YAML de GitHub Actions.
 */
export function auditarWorkflowHandler(req: Request, res: Response): void {
  const { yaml } = req.body;

  if (typeof yaml !== 'string') {
    res.status(400).json({ error: 'Se requiere el campo "yaml" como string.' });
    return;
  }

  const resultado = CicdService.auditarWorkflow(yaml);
  res.json(resultado);
}

/**
 * Retorna el estado actual de la última ejecución del pipeline.
 */
export function obtenerEstadoPipelineHandler(_req: Request, res: Response): void {
  const estado = CicdService.obtenerEstadoActual();
  res.json(estado);
}

/**
 * Ejecuta una simulación local síncrona o con respuesta final.
 */
export async function ejecutarPipelineSimulacionHandler(req: Request, res: Response): Promise<void> {
  const { targetCloud, estrategia, commitSha } = req.body;
  CicdService.crearSimulacionPipeline(targetCloud, estrategia, commitSha);

  const resultado = await CicdService.ejecutarSimulacion(() => {
    // Callback silencioso para ejecución REST tradicional
  });

  res.json(resultado);
}

/**
 * Streaming en tiempo real vía Server-Sent Events (SSE) del progreso del pipeline de despliegue.
 */
export async function ejecutarPipelineStreamHandler(_req: Request, res: Response): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    await CicdService.ejecutarSimulacion((estado) => {
      res.write(`data: ${JSON.stringify(estado)}\n\n`);
    });

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: mensajePublico(error) })}\n\n`);
    res.end();
  }
}
