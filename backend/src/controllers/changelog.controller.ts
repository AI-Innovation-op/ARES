/**
 * @fileoverview Controlador para generación y guardado de CHANGELOG.md basado en Git y Conventional Commits.
 * @module controllers/changelog.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { generarChangelog, escribirChangelog } from '../services/changelog.service.js';

export async function obtenerChangelogHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const version = req.query.version as string | undefined;
    const resultado = generarChangelog(version);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function guardarChangelogHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { version, write, path: rutaDestino } = req.body || {};
    const resultado = generarChangelog(version);
    let rutaGuardado: string | null = null;

    if (write) {
      rutaGuardado = escribirChangelog(resultado.markdown, rutaDestino);
    }

    res.status(200).json({
      ...resultado,
      saved: Boolean(write),
      savedPath: rutaGuardado,
    });
  } catch (error) {
    next(error);
  }
}
