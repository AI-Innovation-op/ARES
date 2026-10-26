/**
 * @fileoverview Servicio del Módulo Escudo Aegis (Generación de Documentación Técnica).
 * Forja README.md, ADR, RFC, contratos OpenAPI 3.1 y diagramas Mermaid.
 * @module services/docshield.service
 */

import { invocarGemini } from './gemini.service.js';
import {
  guardarDocumentoTecnico,
  obtenerSiguienteNumeroADR,
} from '../repositories/documents.repo.js';
import { obtenerOCrearComandantePorDefecto } from '../repositories/commanders.repo.js';
import { obtenerOCrearRepositorioPorDefecto } from '../repositories/repositories.repo.js';
import type { DocGenerateRequest, DocGenerateResponse } from '../types/api.types.js';
import type { TipoDocumento } from '../types/ares.types.js';

/**
 * Genera el prompt táctico especializado según el tipo de documento.
 */
function construirPromptDocumento(tipo: TipoDocumento, contexto: string, titulo?: string): string {
  switch (tipo) {
    case 'README':
      return `Genera un README.md profesional de grado industrial para el siguiente proyecto o código.
Incluye:
1. Título y descripción con badges de estado y stack.
2. Diagrama de arquitectura en bloque Mermaid (\`\`\`mermaid).
3. Requisitos previos e instrucciones de instalación.
4. Variables de entorno necesarias en tabla Markdown.
5. Ejemplos de uso rápido y manejo de errores.
6. Guía de contribución con Conventional Commits.

CONTEXTO DEL PROYECTO:
${contexto}`;

    case 'ADR':
      return `Forja un Registro de Decisión de Arquitectura (ADR) según el formato estándar Michael Nygard.
Estructura obligatoria:
- Título: ${titulo ?? 'Decisión de Arquitectura'}
- Estado: Propuesto / Aceptado
- Contexto y Planteamiento del Problema
- Decisión Considerada (justificación técnica y arquitectónica)
- Consecuencias Positivas y Negativas (Trade-offs claros)
- Alternativas Descartadas y por qué

CONTEXTO Y DECISIÓN:
${contexto}`;

    case 'OPENAPI':
      return `Genera una especificación de contrato OpenAPI 3.1 completa en formato YAML válido para el siguiente módulo o servicio.
Incluye esquemas tipados de componentes, códigos de respuesta HTTP (200, 400, 401, 404, 500) y ejemplos de payload.

CÓDIGO O ESPECIFICACIÓN:
${contexto}`;

    case 'RFC':
      return `Redacta un documento RFC (Request for Comments) formal para proponer una mejora o nueva funcionalidad técnica.
Incluye resumen ejecutivo, motivación, diseño detallado a nivel de sistema, impacto en dependencias, consideraciones de seguridad y plan de adopción.

IDEA O PROPUESTA:
${contexto}`;

    case 'MERMAID_C4':
      return `Genera un diagrama de arquitectura C4 (Nivel 1 Contexto o Nivel 2 Contenedores) en sintaxis válida de Mermaid.js (\`\`\`mermaid).
Explica brevemente cada componente y sus flujos de datos.

SISTEMA A MODELAR:
${contexto}`;

    case 'DOCSTRINGS':
    default:
      return `Documenta exhaustivamente el siguiente código fuente agregando comentarios en formato JSDoc/TSDoc para cada clase, interfaz, función, parámetro y excepción. No alteres la lógica funcional del código.

CÓDIGO FUENTE:
${contexto}`;
  }
}

/**
 * Genera un artefacto documental mediante el Escudo Aegis.
 */
export async function generarDocumentacion(
  request: DocGenerateRequest
): Promise<DocGenerateResponse> {
  const { docType, sourceContext, repositoryId, title } = request;

  const prompt = construirPromptDocumento(docType, sourceContext, title);

  const respuesta = await invocarGemini({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    enableSearch: false,
  });

  const tituloFinal = title ?? `${docType} - Documento Forjado`;
  let documentId: string | null = null;

  // Persistir en la bóveda (usando repositorio especificado o el predeterminado)
  let repoId = repositoryId;
  if (!repoId || repoId === 'default') {
    try {
      const cmd = await obtenerOCrearComandantePorDefecto();
      const defRepo = await obtenerOCrearRepositorioPorDefecto(cmd.id);
      repoId = defRepo.id;
    } catch (e) {
      console.warn('⚠️ [DocShield] No se pudo obtener repositorio por defecto:', e);
    }
  }

  if (repoId) {
    try {
      let numeroADR: number | null = null;
      if (docType === 'ADR') {
        numeroADR = await obtenerSiguienteNumeroADR(repoId);
      }

      const guardado = await guardarDocumentoTecnico({
        repositoryId: repoId,
        docType,
        title: tituloFinal,
        markdownContent: respuesta.texto,
        adrNumber: numeroADR,
      });
      documentId = guardado.id;
    } catch (err) {
      console.warn('⚠️ [DocShield] No se pudo persistir el documento en BD:', err);
    }
  }

  return {
    markdownContent: respuesta.texto,
    docType,
    title: tituloFinal,
    documentId,
    stance: 'SHIELD',
    poseNumber: 15, // Santuario Documental
  };
}
