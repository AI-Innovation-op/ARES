/**
 * @fileoverview Repositorio para la Bóveda del Escudo Aegis (technical_documents).
 * @module repositories/documents.repo
 */

import { consulta } from '../config/db.js';
import type { DocumentoTecnico, TipoDocumento } from '../types/ares.types.js';

/**
 * Obtiene el siguiente número de ADR correlativo para un repositorio.
 */
export async function obtenerSiguienteNumeroADR(repositoryId: string): Promise<number> {
  const { rows } = await consulta<{ max_num: number | null }>(
    `SELECT MAX(adr_number) AS max_num 
     FROM technical_documents 
     WHERE repository_id = $1 AND doc_type = 'ADR'`,
    [repositoryId]
  );
  return (rows[0]?.max_num ?? 0) + 1;
}

/**
 * Guarda o actualiza un documento técnico forjado por el Escudo Aegis.
 */
export async function guardarDocumentoTecnico(params: {
  repositoryId: string;
  docType: TipoDocumento;
  title: string;
  markdownContent: string;
  adrNumber?: number | null;
  version?: string;
}): Promise<DocumentoTecnico> {
  const {
    repositoryId,
    docType,
    title,
    markdownContent,
    adrNumber = null,
    version = '1.0.0',
  } = params;

  const { rows } = await consulta<DocumentoTecnico>(
    `INSERT INTO technical_documents (
       repository_id, doc_type, adr_number, title, version, markdown_content, status
     ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
     RETURNING *`,
    [repositoryId, docType, adrNumber, title, version, markdownContent]
  );

  return rows[0];
}

/**
 * Obtiene documentos generados para un repositorio.
 */
export async function listarDocumentosPorRepositorio(
  repositoryId: string,
  tipo?: TipoDocumento
): Promise<DocumentoTecnico[]> {
  if (tipo) {
    const { rows } = await consulta<DocumentoTecnico>(
      `SELECT * FROM technical_documents 
       WHERE repository_id = $1 AND doc_type = $2 
       ORDER BY created_at DESC`,
      [repositoryId, tipo]
    );
    return rows;
  }

  const { rows } = await consulta<DocumentoTecnico>(
    `SELECT * FROM technical_documents 
     WHERE repository_id = $1 
     ORDER BY created_at DESC`,
    [repositoryId]
  );
  return rows;
}
