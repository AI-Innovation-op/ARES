/**
 * @fileoverview Middleware centralizado de manejo de errores para A.R.E.S.
 * Captura excepciones, formatea respuestas de error tácticas y asigna códigos HTTP.
 * @module middleware/error.middleware
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Clase de error específica para fallos relacionados con la API de Gemini o IA.
 */
export class GeminiError extends Error {
  public statusCode: number;
  public detalles?: unknown;

  constructor(mensaje: string, statusCode: number = 502, detalles?: unknown) {
    super(mensaje);
    this.name = 'GeminiError';
    this.statusCode = statusCode;
    this.detalles = detalles;
  }
}

/**
 * Clase de error de validación de entrada o reglas de negocio.
 */
export class ValidationError extends Error {
  public statusCode: number;

  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

/**
 * Texto de error seguro para enviar al cliente: en producción NO se expone el mensaje interno.
 */
export function mensajePublico(err: unknown): string {
  if (process.env.NODE_ENV === 'production') return 'Error interno del servidor.';
  return (err as Error)?.message || 'Error desconocido';
}

/**
 * Middleware global de captura de errores de Express.
 */
export function manejadorErrores(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`💥 [Error] ${err.name}: ${err.message}`, err.stack);

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      error: 'Parámetros inválidos en la orden táctica',
      mensaje: err.message,
      codigo: 'VALIDATION_ERROR',
    });
    return;
  }

  if (err instanceof GeminiError) {
    res.status(err.statusCode).json({
      error: 'Falla en el Núcleo Táctico de IA',
      mensaje: err.message,
      detalles: err.detalles,
      codigo: 'GEMINI_ERROR',
    });
    return;
  }

  // Errores 4xx de librerías (body-parser: JSON inválido = 400, payload grande = 413)
  const estado = Number((err as any).status ?? (err as any).statusCode);
  if (estado >= 400 && estado < 500) {
    res.status(estado).json({
      error: estado === 413 ? 'Payload demasiado grande' : 'Petición inválida',
      codigo: 'BAD_REQUEST',
    });
    return;
  }

  // Error genérico / no controlado
  res.status(500).json({
    error: 'Alerta de Excepción Interna en la Consola A.R.E.S.',
    mensaje: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor. Revisa los registros tácticos.' 
      : err.message,
    codigo: 'INTERNAL_SERVER_ERROR',
  });
}
