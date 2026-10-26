/**
 * @fileoverview DTOs de request y response para la API REST de A.R.E.S.
 * Contratos de entrada/salida que se validan en los controladores.
 * @module types/api.types
 */

import type { Postura, NumeroPose, TipoDocumento, Metricas } from './ares.types.js';

// ============================================================================
// Chat
// ============================================================================

/** Cuerpo de la solicitud POST /api/chat */
export interface ChatRequest {
  /** Mensaje del comandante */
  message: string;
  /** ID de conversación existente (null → crea nueva) */
  conversationId?: string;
  /** Imagen codificada en Base64 (opcional) */
  imageBase64?: string;
  /** ID del comandante (en producción vendrá del JWT) */
  commanderId?: string;
  /** Proveedor de IA preferido ('gemini' | 'openrouter') */
  provider?: 'gemini' | 'openrouter';
  /** Modelo específico a consultar (ej: deepseek/deepseek-chat) */
  model?: string;
}

/** Respuesta del endpoint POST /api/chat */
export interface ChatResponse {
  /** Texto de respuesta del agente */
  reply: string;
  /** Postura actual del agente */
  stance: Postura;
  /** Número de pose del avatar */
  poseNumber: NumeroPose;
  /** ID de la conversación (nuevo o existente) */
  conversationId: string;
  /** Fuentes de grounding (Google Search) */
  sources: Array<{ uri: string; title: string }>;
  /** Proveedor usado para generar la respuesta */
  provider?: string;
  /** Modelo específico usado */
  model?: string;
}

// ============================================================================
// Auditoría de Código (Espada Binaria)
// ============================================================================

/** Cuerpo de la solicitud POST /api/audit */
export interface AuditRequest {
  /** Lenguaje de programación del código */
  language: string;
  /** Código fuente a auditar */
  code: string;
  /** ID del repositorio asociado */
  repositoryId?: string;
}

/** Respuesta del endpoint POST /api/audit */
export interface AuditResponse {
  /** Análisis completo generado por A.R.E.S. */
  analysis: string;
  /** Código refactorizado */
  refactoredCode: string;
  /** Métricas parseadas (Big-O, SOLID, Seguridad) */
  metrics: Metricas | null;
  /** Postura adoptada durante la auditoría */
  stance: Postura;
  /** Número de pose */
  poseNumber: NumeroPose;
}

// ============================================================================
// Generación de Documentación (Escudo Aegis)
// ============================================================================

/** Cuerpo de la solicitud POST /api/documents/generate */
export interface DocGenerateRequest {
  /** Tipo de documento a generar */
  docType: TipoDocumento;
  /** Contexto fuente: código, estructura de directorios, etc. */
  sourceContext: string;
  /** ID del repositorio asociado */
  repositoryId?: string;
  /** Título del documento (opcional, se autogenera si falta) */
  title?: string;
}

/** Respuesta del endpoint POST /api/documents/generate */
export interface DocGenerateResponse {
  /** Contenido Markdown generado */
  markdownContent: string;
  /** Tipo de documento generado */
  docType: TipoDocumento;
  /** Título asignado al documento */
  title: string;
  /** ID del documento en la base de datos (si se almacenó) */
  documentId: string | null;
  /** Postura adoptada */
  stance: Postura;
  /** Número de pose */
  poseNumber: NumeroPose;
}
