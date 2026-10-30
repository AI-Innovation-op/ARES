/**
 * @fileoverview Controlador REST para el Oráculo de Memoria Semántica Vectorial Local (A.R.E.S. v3.3).
 * @module controllers/memory.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/error.middleware.js';
import { MemoryService, type MemoryCollection } from '../services/memory.service.js';

export async function listarMemoriasHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coleccion = req.query.collection as MemoryCollection | undefined;
    const memorias = await MemoryService.listarMemorias(coleccion);
    res.json({ total: memorias.length, memorias });
  } catch (error) {
    next(error);
  }
}

export async function guardarMemoriaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content, collection, tags, metadata, id } = req.body ?? {};
    if (typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim()) {
      throw new ValidationError('Los campos "title" y "content" son obligatorios y deben ser texto.');
    }
    if (title.length > 200 || content.length > 50_000) {
      throw new ValidationError('"title" admite máx. 200 caracteres y "content" máx. 50.000.');
    }
    // Un cliente solo puede actualizar memorias creadas por él (prefijo mem-); las sembradas (ADR-001...) no.
    if (id !== undefined && !/^mem-[A-Za-z0-9-]{1,64}$/.test(String(id))) {
      throw new ValidationError('"id" inválido: solo se pueden actualizar memorias que empiecen por "mem-".');
    }

    const nuevaMemoria = await MemoryService.guardarMemoria({
      id,
      title,
      content,
      collection: collection || 'general',
      tags: Array.isArray(tags) ? tags : [],
      metadata: metadata || {}
    });

    res.status(201).json(nuevaMemoria);
  } catch (error) {
    next(error);
  }
}

export async function buscarSemanticaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query, threshold, limit, collection } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'El campo "query" es obligatorio.' });
      return;
    }

    const umbral = typeof threshold === 'number' ? threshold : 0.55;
    const maxItems = typeof limit === 'number' ? limit : 6;

    const resultado = await MemoryService.buscarSemantica(
      query,
      umbral,
      maxItems,
      collection as MemoryCollection | undefined
    );

    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function eliminarMemoriaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    await MemoryService.eliminarMemoria(id);
    res.json({ success: true, message: `Memoria ${id} eliminada.` });
  } catch (error) {
    next(error);
  }
}

export async function obtenerEstadisticasHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await MemoryService.obtenerEstadisticas();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}
