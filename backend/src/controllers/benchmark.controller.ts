/**
 * @fileoverview Controlador REST para la Suite de Pruebas E2E, Mutación Stryker y Benchmarks k6 (v3.8).
 * Expone endpoints para ejecutar benchmarks en vivo, generar suites de testing y consultar métricas.
 * @module controllers/benchmark.controller
 */

import { Request, Response, NextFunction } from 'express';
import { BenchmarkService } from '../services/benchmark.service.js';

/**
 * Ejecuta o simula en vivo una corrida completa de pruebas E2E, Mutación con Stryker y Carga con k6.
 * POST /api/benchmark/run
 */
export async function runBenchmarkHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { titulo, boundedContexts } = req.body;
    const resultado = BenchmarkService.ejecutarSuiteCompleta(
      titulo || 'Sistema DDD Táctico',
      Array.isArray(boundedContexts) ? boundedContexts : []
    );

    res.status(200).json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Genera el paquete de archivos de testing (E2E spec, stryker.config.json, k6.js) para un proyecto.
 * POST /api/benchmark/generate
 */
export async function generateBenchmarkFilesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { titulo, boundedContexts } = req.body;
    const tituloNormalizado = titulo || 'Sistema DDD Táctico';
    const ctxList = Array.isArray(boundedContexts) ? boundedContexts : [];

    const e2eCode = BenchmarkService.generarSuiteE2E(tituloNormalizado, ctxList);
    const strykerConfig = BenchmarkService.generarStrykerConfig('vitest');
    const k6Script = BenchmarkService.generarScriptK6(tituloNormalizado);

    res.status(200).json({
      success: true,
      files: {
        'tests/e2e/integration.e2e.test.ts': e2eCode,
        'stryker.config.json': strykerConfig,
        'benchmarks/k6-load-test.js': k6Script,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Devuelve el catálogo de presets y umbrales de prueba admitidos.
 * GET /api/benchmark/presets
 */
export async function listBenchmarkPresetsHandler(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    presets: [
      {
        id: 'smoke',
        nombre: 'Smoke Test (Prueba de Humo Rápida)',
        descripcion: 'Verificación superficial de disponibilidad de endpoints con 2 VUs durante 10 segundos.',
        vus: 2,
        duracion: '10s',
      },
      {
        id: 'load',
        nombre: 'Ramping Concurrency (Carga Nominal)',
        descripcion: 'Rampa de subida progresiva de 0 a 50 VUs evaluando percentiles P95 y P99 de latencia.',
        vus: 50,
        duracion: '60s',
      },
      {
        id: 'stryker-mutation',
        nombre: 'Análisis de Mutación Stryker (MSI)',
        descripcion: 'Inyección de fallas semánticas en Agregados y Value Objects para verificar cobertura real.',
        mutadores: ['Equality', 'Boolean', 'Arithmetic', 'Conditional'],
      },
      {
        id: 'stress-spike',
        nombre: 'Stress Spike (Pico Extremo de Tráfico)',
        descripcion: 'Inyección súbita de 150 VUs para evaluar la resiliencia del motor de transacciones DDD.',
        vus: 150,
        duracion: '30s',
      },
    ],
  });
}
