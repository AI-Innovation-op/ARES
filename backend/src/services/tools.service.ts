/**
 * @fileoverview Servicio de Function Calling (Llamado de Herramientas Estructurado) de A.R.E.S.
 * Conecta los esquemas de la Ficha Técnica con los motores de ejecución del backend.
 * @module services/tools.service
 */

import { generarDocumentacion } from './docshield.service.js';
import { auditarYRefactorizarCodigo } from './codesword.service.js';
import type { TipoDocumento } from '../types/ares.types.js';

/**
 * Declaraciones canónicas de herramientas expuestas al modelo Gemini.
 */
export const DECLARACIONES_HERRAMIENTAS = [
  {
    name: 'set_ares_pose',
    description: 'Cambia la pose del avatar de A.R.E.S. según el contexto táctico o estado de combate.',
    parameters: {
      type: 'OBJECT',
      properties: {
        poseNumber: {
          type: 'INTEGER',
          description: 'Número de pose canónica del 1 al 16 (1: IDLE, 2: ERROR, 6: SPRINT, 11: SLASH, 14: BIO, 15: SHIELD, 16: VICTORY)',
        },
        speech: {
          type: 'STRING',
          description: 'Frase táctica breve y concisa que acompaña la orden',
        },
      },
      required: ['poseNumber'],
    },
  },
  {
    name: 'forge_technical_documentation',
    description: 'Genera artefactos de documentación técnica de grado industrial (README, ADR, RFC, OPENAPI, MERMAID_C4, DOCSTRINGS).',
    parameters: {
      type: 'OBJECT',
      properties: {
        docType: {
          type: 'STRING',
          enum: ['README', 'ADR', 'RFC', 'OPENAPI', 'MERMAID_C4', 'DOCSTRINGS'],
          description: 'Tipo de documento a forjar',
        },
        sourceContext: {
          type: 'STRING',
          description: 'Código fuente, especificación o arquitectura a documentar',
        },
      },
      required: ['docType', 'sourceContext'],
    },
  },
  {
    name: 'audit_and_refactor_code',
    description: 'Ejecuta auditoría de seguridad OWASP, cálculo de salto de complejidad Big-O y refactorización SOLID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        language: {
          type: 'STRING',
          description: 'Lenguaje de programación (TypeScript, Python, Go, SQL, etc.)',
        },
        codeSnippet: {
          type: 'STRING',
          description: 'Fragmento de código a auditar y optimizar',
        },
      },
      required: ['language', 'codeSnippet'],
    },
  },
];

/**
 * Ejecuta una llamada a herramienta devuelta por Gemini.
 */
export async function ejecutarHerramienta(
  nombre: string,
  argumentos: Record<string, any>
): Promise<Record<string, any>> {
  // No registrar los argumentos: pueden contener código o datos privados del usuario.
  console.log(`⚡ [FunctionCalling] Ejecutando herramienta táctica: "${nombre}"`);

  switch (nombre) {
    case 'set_ares_pose': {
      return {
        ejecutado: true,
        poseNumber: argumentos.poseNumber,
        speech: argumentos.speech ?? 'Pose táctica adoptada.',
      };
    }

    case 'forge_technical_documentation': {
      const resultado = await generarDocumentacion({
        docType: argumentos.docType as TipoDocumento,
        sourceContext: argumentos.sourceContext,
      });
      return {
        ejecutado: true,
        docType: resultado.docType,
        title: resultado.title,
        markdownContent: resultado.markdownContent,
      };
    }

    case 'audit_and_refactor_code': {
      const resultado = await auditarYRefactorizarCodigo({
        language: argumentos.language,
        code: argumentos.codeSnippet,
      });
      return {
        ejecutado: true,
        metrics: resultado.metrics,
        refactoredCode: resultado.refactoredCode,
        analysis: resultado.analysis,
      };
    }

    default:
      throw new Error(`Herramienta no reconocida en la armería de A.R.E.S.: ${nombre}`);
  }
}
