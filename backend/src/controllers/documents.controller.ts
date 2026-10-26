/**
 * @fileoverview Controlador del endpoint POST /api/documents/generate y consultas de documentos.
 * @module controllers/documents.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { generarDocumentacion } from '../services/docshield.service.js';
import { listarDocumentosPorRepositorio } from '../repositories/documents.repo.js';
import { obtenerOCrearRepositorioPorDefecto } from '../repositories/repositories.repo.js';
import { obtenerOCrearComandantePorDefecto } from '../repositories/commanders.repo.js';
import { ValidationError } from '../middleware/error.middleware.js';
import type { DocGenerateRequest } from '../types/api.types.js';
import type { TipoDocumento } from '../types/ares.types.js';

const TIPOS_VALIDOS: TipoDocumento[] = [
  'README',
  'ADR',
  'RFC',
  'OPENAPI',
  'CHANGELOG',
  'MERMAID_C4',
  'DOCSTRINGS',
];

export async function generarDocumentoHandler(
  req: Request<unknown, unknown, DocGenerateRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { docType, sourceContext, repositoryId, title } = req.body;

    if (!docType || !TIPOS_VALIDOS.includes(docType)) {
      throw new ValidationError(
        `Tipo de documento "${docType}" no válido. Valores permitidos: ${TIPOS_VALIDOS.join(', ')}`
      );
    }

    if (!sourceContext || typeof sourceContext !== 'string' || sourceContext.trim().length === 0) {
      throw new ValidationError('El campo "sourceContext" es obligatorio.');
    }

    const resultado = await generarDocumentacion({
      docType,
      sourceContext: sourceContext.trim(),
      repositoryId,
      title,
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function listarDocumentosHandler(
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
    const tipo = req.query.tipo as TipoDocumento | undefined;

    const documentos = await listarDocumentosPorRepositorio(repositoryId, tipo);
    res.status(200).json({ repositoryId, documentos });
  } catch (error) {
    next(error);
  }
}
