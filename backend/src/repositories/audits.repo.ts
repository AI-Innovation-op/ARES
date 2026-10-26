/**
 * @fileoverview Repositorio para la tabla code_audits (Espada Binaria).
 * Guarda diagnósticos de seguridad, refactorizaciones y métricas Big-O/SOLID.
 * @module repositories/audits.repo
 */

import { consulta } from '../config/db.js';
import type { AuditoriaCodigoEntidad } from '../types/ares.types.js';

export async function guardarAuditoriaCodigo(params: {
  repositoryId: string;
  filePath: string;
  originalComplexity?: string | null;
  optimizedComplexity?: string | null;
  solidScoreBefore?: number | null;
  solidScoreAfter?: number | null;
  securityBefore?: string | null;
  securityAfter?: string | null;
  vulnerabilitiesFound?: Array<{ code: string; description: string }>;
  refactoredCode: string;
}): Promise<AuditoriaCodigoEntidad> {
  const {
    repositoryId,
    filePath,
    originalComplexity = null,
    optimizedComplexity = null,
    solidScoreBefore = null,
    solidScoreAfter = null,
    securityBefore = null,
    securityAfter = null,
    vulnerabilitiesFound = [],
    refactoredCode,
  } = params;

  const { rows } = await consulta<AuditoriaCodigoEntidad>(
    `INSERT INTO code_audits (
       repository_id, file_path, original_complexity, optimized_complexity,
       solid_score_before, solid_score_after, security_before, security_after,
       vulnerabilities_found, refactored_code
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      repositoryId,
      filePath,
      originalComplexity,
      optimizedComplexity,
      solidScoreBefore,
      solidScoreAfter,
      securityBefore,
      securityAfter,
      JSON.stringify(vulnerabilitiesFound),
      refactoredCode,
    ]
  );

  return rows[0];
}

export async function listarAuditoriasPorRepositorio(
  repositoryId: string,
  limite: number = 20
): Promise<AuditoriaCodigoEntidad[]> {
  const { rows } = await consulta<AuditoriaCodigoEntidad>(
    `SELECT * FROM code_audits
     WHERE repository_id = $1
     ORDER BY audited_at DESC
     LIMIT $2`,
    [repositoryId, limite]
  );
  return rows;
}
