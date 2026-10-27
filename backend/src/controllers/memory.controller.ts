/**
 * @fileoverview Controlador REST para el Oráculo de Memoria Semántica Vectorial Local (A.R.E.S. v3.3).
 * @module controllers/memory.controller
 */

import type { Request, Response } from 'express';
import { MemoryService, type MemoryCollection } from '../services/memory.service.js';

export async function listarMemoriasHandler(req: Request, res: Response): Promise<void> {
  try {
    const coleccion = req.query.collection as MemoryCollection | undefined;
    const memorias = await MemoryService.listarMemorias(coleccion);
    res.json({ total: memorias.length, memorias });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error listando memorias' });
  }
}

export async function guardarMemoriaHandler(req: Request, res: Response): Promise<void> {
  try {
    const { title, content, collection, tags, metadata, id } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Los campos "title" y "content" son obligatorios.' });
      return;
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error guardando memoria' });
  }
}

export async function buscarSemanticaHandler(req: Request, res: Response): Promise<void> {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error en búsqueda semántica' });
  }
}

export async function eliminarMemoriaHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    await MemoryService.eliminarMemoria(id);
    res.json({ success: true, message: `Memoria ${id} eliminada.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error eliminando memoria' });
  }
}

export async function obtenerEstadisticasHandler(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await MemoryService.obtenerEstadisticas();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error obteniendo estadísticas' });
  }
}
