/**
 * @fileoverview Servicio Frontend para la Suite de Pruebas E2E, Mutación Stryker y Benchmarks k6 (v3.8).
 * @module services/benchmark.service
 */

import axios from 'axios';
import { API_BASE_ORIGIN, protegerAxios } from './http.js';

const api = axios.create({
  baseURL: `${API_BASE_ORIGIN}/api`,
});
protegerAxios(api);

export interface StrykerMutant {
  id: string;
  mutatorName: string;
  archivo: string;
  linea: number;
  original: string;
  mutado: string;
  estado: 'Killed' | 'Survived' | 'NoCoverage' | 'CompileError';
  testAsesino?: string;
  boundedContext: string;
}

export interface StrykerReport {
  mutationScore: number;
  totalMutants: number;
  killed: number;
  survived: number;
  noCoverage: number;
  compileErrors: number;
  runtimeMs: number;
  mutantes: StrykerMutant[];
  archivoConfig: string;
}

export interface K6MetricThreshold {
  metrica: string;
  objetivo: string;
  resultado: string;
  cumplido: boolean;
}

export interface K6BenchmarkReport {
  escenario: string;
  virtualUsers: number;
  duracionSegundos: number;
  totalPeticiones: number;
  peticionesPorSegundo: number;
  latenciaP50Ms: number;
  latenciaP90Ms: number;
  latenciaP95Ms: number;
  latenciaP99Ms: number;
  tasaErrorHttp: number;
  dataTransferredMb: number;
  thresholds: K6MetricThreshold[];
  scriptGenerado: string;
}

export interface E2ETestResult {
  suite: string;
  nombre: string;
  boundedContextsInvolucrados: string[];
  duracionMs: number;
  estado: 'passed' | 'failed';
  detalles: string;
}

export interface SuiteBenchmarkCompleta {
  id: string;
  timestamp: string;
  tituloProyecto: string;
  duracionTotalMs: number;
  e2e: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    tests: E2ETestResult[];
    archivoTest: string;
  };
  stryker: StrykerReport;
  k6: K6BenchmarkReport;
}

export const benchmarkService = {
  async ejecutarSuite(titulo?: string, boundedContexts?: Array<{ nombre: string; identificador: string }>): Promise<SuiteBenchmarkCompleta> {
    const res = await api.post('/benchmark/run', {
      titulo: titulo || 'Sistema DDD Táctico',
      boundedContexts: boundedContexts || [],
    });
    return res.data.data;
  },

  async obtenerPresets(): Promise<any[]> {
    const res = await api.get('/benchmark/presets');
    return res.data.presets || [];
  },

  async generarArchivos(titulo?: string, boundedContexts?: any[]): Promise<Record<string, string>> {
    const res = await api.post('/benchmark/generate', {
      titulo,
      boundedContexts,
    });
    return res.data.files || {};
  },
};
