/**
 * @fileoverview Controlador REST para la Forja de Ejercicios y Autómata Git (v3.5).
 * Expone endpoints para sanitizar enunciados de PDF, forjar arquitecturas DDD completas
 * y ejecutar commits atómicos soberanos en GitHub.
 * @module controllers/assignment.controller
 */

import { Request, Response, NextFunction } from 'express';
import { ExerciseParserService } from '../services/exercise-parser.service.js';
import { ExerciseForgeService } from '../services/exercise-forge.service.js';
import { GitAutomatorService } from '../services/git-automator.service.js';

export const STACKS_SOPORTADOS = [
  {
    id: 'typescript-ddd',
    nombre: 'TypeScript + Node.js (DDD Hexagonal)',
    descripcion: 'Clean Architecture canónica con capas Domain, Application e Infrastructure, Value Objects y Tests.',
    icono: '🛡️',
  },
  {
    id: 'vite-vue-ts',
    nombre: 'Vite + Vue 3 + TypeScript',
    descripcion: 'Frontend modular reactivo con componentes estructurados por Bounded Contexts y vistas interactivas.',
    icono: '⚡',
  },
  {
    id: 'express-hexagonal',
    nombre: 'Express + TypeScript Hexagonal',
    descripcion: 'API REST robusta con controladores adaptadores, inyección de dependencias y middlewares OWASP.',
    icono: '⚔️',
  },
];

/**
 * Limpia y desofusca texto crudo pegado de enunciados o PDFs académicos.
 * POST /api/assignment/clean-text
 */
export async function cleanTextHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text, stack } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'El campo "text" es obligatorio y debe ser una cadena de texto.' });
      return;
    }

    const analysis = ExerciseParserService.parsearEnunciado(text, stack);
    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Genera el proyecto DDD completo, README humanizado y cronograma de commits atómicos.
 * POST /api/assignment/forge
 */
export async function forgeAssignmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text, analysis: providedAnalysis, author, stack } = req.body;

    const autorConfig = {
      name: author?.name?.trim() || 'Kevin Commander',
      email: author?.email?.trim() || 'kevin.commander@gmail.com',
      branchName: author?.branchName?.trim(),
      remoteUrl: author?.remoteUrl?.trim(),
      githubToken: author?.githubToken?.trim(),
      teamMembers: Array.isArray(author?.teamMembers) ? author.teamMembers : undefined,
    };

    let analysis = providedAnalysis;
    if (!analysis) {
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Debes proporcionar "text" o un "analysis" previo.' });
        return;
      }
      analysis = ExerciseParserService.parsearEnunciado(text, stack);
    }

    const project = ExerciseForgeService.forjarProyecto(analysis, autorConfig, stack || 'typescript-ddd');

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Ejecuta físicamente en el sandbox del backend los commits atómicos con git CLI y opcionalmente push.
 * POST /api/assignment/execute-git
 */
export async function executeGitHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { files, plan } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'El array "files" es obligatorio para ejecutar git.' });
      return;
    }

    if (!plan || !plan.commits || !plan.autor) {
      res.status(400).json({ error: 'El objeto "plan" con commits y autor es obligatorio.' });
      return;
    }

    const result = await GitAutomatorService.ejecutarGitSoberano(files, plan);

    res.status(200).json({
      success: result.exitoso,
      result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retorna los stacks tecnológicos soportados para la forja.
 * GET /api/assignment/stacks
 */
export async function listStacksHandler(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    stacks: STACKS_SOPORTADOS,
  });
}
