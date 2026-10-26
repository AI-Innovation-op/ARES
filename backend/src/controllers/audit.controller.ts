/**
 * @fileoverview Controlador del endpoint POST /api/audit (Espada Binaria).
 * @module controllers/audit.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { auditarYRefactorizarCodigo, generarSuitePruebas, type SolicitudTestForge } from '../services/codesword.service.js';
import { listarAuditoriasPorRepositorio } from '../repositories/audits.repo.js';
import { obtenerOCrearRepositorioPorDefecto } from '../repositories/repositories.repo.js';
import { obtenerOCrearComandantePorDefecto } from '../repositories/commanders.repo.js';
import { ValidationError } from '../middleware/error.middleware.js';
import type { AuditRequest } from '../types/api.types.js';

export async function auditarCodigoHandler(
  req: Request<unknown, unknown, AuditRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { language, code, repositoryId } = req.body;

    if (!language || typeof language !== 'string') {
      throw new ValidationError('El campo "language" es obligatorio.');
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new ValidationError('El campo "code" es obligatorio y debe contener código a auditar.');
    }

    const resultado = await auditarYRefactorizarCodigo({
      language: language.trim(),
      code: code.trim(),
      repositoryId,
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para generar suites de pruebas unitarias (Test Forge).
 */
export async function generarPruebasHandler(
  req: Request<unknown, unknown, SolicitudTestForge>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { language, code, framework, focus } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new ValidationError('El campo "code" es obligatorio.');
    }

    const resultado = await generarSuitePruebas({
      code: code.trim(),
      language: language || 'TypeScript',
      framework: framework || 'vitest',
      focus,
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

/**
 * Lista las auditorías de código previas realizadas en un repositorio.
 */
export async function listarAuditoriasHandler(
  req: Request<{ repositoryId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let { repositoryId } = req.params;
    if (repositoryId === 'default' || !repositoryId) {
      const comandante = await obtenerOCrearComandantePorDefecto();
      const repo = await obtenerOCrearRepositorioPorDefecto(comandante.id);
      repositoryId = repo.id;
    }

    const auditorias = await listarAuditoriasPorRepositorio(repositoryId);
    res.status(200).json({ repositoryId, auditorias });
  } catch (error) {
    next(error);
  }
}

