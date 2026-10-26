/**
 * @fileoverview Controlador del endpoint GET /api/bio/:commanderId y registro de hidratación.
 * @module controllers/bio.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { evaluarEstadoBio } from '../services/bio.service.js';
import { obtenerUltimaTelemetria } from '../repositories/bio.repo.js';
import { obtenerOCrearComandantePorDefecto } from '../repositories/commanders.repo.js';

export async function obtenerEstadoBioHandler(
  req: Request<{ commanderId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let { commanderId } = req.params;
    if (!commanderId || commanderId === 'default') {
      const comandante = await obtenerOCrearComandantePorDefecto();
      commanderId = comandante.id;
    }

    const minutos = parseInt(req.query.minutos as string ?? '0', 10);
    const agua = parseInt(req.query.agua as string ?? '80', 10);
    const penalizacion = parseInt(req.query.penalizacion as string ?? '0', 10);
    const bono = parseInt(req.query.bono as string ?? '0', 10);

    const estado = await evaluarEstadoBio({
      commanderId,
      minutosSesion: minutos,
      aguaPct: agua,
      penalizacionFatiga: penalizacion,
      bonoDescanso: bono,
    });

    res.status(200).json(estado);
  } catch (error) {
    next(error);
  }
}

export async function obtenerUltimaTelemetriaHandler(
  req: Request<{ commanderId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let { commanderId } = req.params;
    if (!commanderId || commanderId === 'default') {
      const comandante = await obtenerOCrearComandantePorDefecto();
      commanderId = comandante.id;
    }

    const telemetria = await obtenerUltimaTelemetria(commanderId);
    res.status(200).json({ telemetria });
  } catch (error) {
    next(error);
  }
}
