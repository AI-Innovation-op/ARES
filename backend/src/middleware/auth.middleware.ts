/**
 * @fileoverview Middleware de acceso por API key (cabecera `x-api-key`).
 * - Con ARES_API_KEY definida: exige la clave en toda ruta donde se monte.
 * - Sin ARES_API_KEY en desarrollo: deja pasar (cómodo en local).
 * - Sin ARES_API_KEY en producción: responde 503 (seguro por defecto).
 * @module middleware/auth
 */

import crypto from 'node:crypto';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export interface OpcionesApiKey {
  /** Valor de ARES_API_KEY ('' si no está configurada) */
  claveEsperada: string;
  /** true cuando NODE_ENV === 'production' */
  produccion: boolean;
}

function huella(texto: string): Buffer {
  return crypto.createHash('sha256').update(texto).digest();
}

export function crearMiddlewareApiKey({ claveEsperada, produccion }: OpcionesApiKey): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!claveEsperada) {
      if (produccion) {
        res.status(503).json({
          error: 'API deshabilitada: el servidor no tiene ARES_API_KEY configurada.',
          codigo: 'API_KEY_NOT_CONFIGURED',
        });
        return;
      }
      next();
      return;
    }

    const recibida = req.header('x-api-key') ?? '';
    // Comparación en tiempo constante (ambas huellas miden 32 bytes)
    if (!crypto.timingSafeEqual(huella(recibida), huella(claveEsperada))) {
      res.status(401).json({ error: 'Clave de acceso inválida o ausente.', codigo: 'UNAUTHORIZED' });
      return;
    }
    next();
  };
}
