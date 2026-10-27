/**
 * @fileoverview Controlador REST para el Radar de Arquitectura C4 & Simulador de Flujos (A.R.E.S. v3.4).
 * @module controllers/architecture.controller
 */

import type { Request, Response } from 'express';
import { ArchitectureService } from '../services/architecture.service.js';

export function listarTopologiasHandler(_req: Request, res: Response): void {
  const topologias = ArchitectureService.listarTopologias();
  res.json({ total: topologias.length, topologias });
}

export function obtenerTopologiaHandler(req: Request, res: Response): void {
  const id = req.params.id ? String(req.params.id) : undefined;
  const topo = ArchitectureService.obtenerTopologia(id);
  res.json(topo);
}

export function simularTraficoHandler(req: Request, res: Response): void {
  const multiplicador = typeof req.body.multiplier === 'number' ? req.body.multiplier : 2.0;
  const topo = ArchitectureService.simularTrafico(multiplicador);
  res.json({
    mensaje: `Ráfaga de tráfico inyectada (${multiplicador}x de carga).`,
    topologia: topo,
  });
}

export function inyectarCaosHandler(req: Request, res: Response): void {
  const { nodoId } = req.body;
  const resultado = ArchitectureService.inyectarCaos(nodoId);
  res.json(resultado);
}

export function restaurarTopologiaHandler(_req: Request, res: Response): void {
  const topo = ArchitectureService.restaurarTopologia();
  res.json({
    mensaje: 'Topología restaurada al 100% de salud nominal.',
    topologia: topo,
  });
}

export function exportarC4Handler(req: Request, res: Response): void {
  const id = req.query.id ? String(req.query.id) : undefined;
  const mermaid = ArchitectureService.exportarMermaidC4(id);
  res.json({ mermaid });
}
