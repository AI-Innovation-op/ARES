/**
 * @fileoverview Controlador para la administración de repositorios (Proyectos protegidos por A.R.E.S.).
 * @module controllers/repositories.controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  obtenerOCrearRepositorioPorDefecto,
  listarRepositoriosPorComandante,
  obtenerRepositorioPorId,
} from '../repositories/repositories.repo.js';
import { obtenerOCrearComandantePorDefecto } from '../repositories/commanders.repo.js';

export async function listarRepositoriosHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const comandante = await obtenerOCrearComandantePorDefecto();
    const repositorios = await listarRepositoriosPorComandante(comandante.id);
    res.status(200).json({ repositorios });
  } catch (error) {
    next(error);
  }
}

export async function obtenerRepositorioActivoHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const comandante = await obtenerOCrearComandantePorDefecto();
    const repo = await obtenerOCrearRepositorioPorDefecto(comandante.id);
    res.status(200).json({ repository: repo, commander: comandante });
  } catch (error) {
    next(error);
  }
}
