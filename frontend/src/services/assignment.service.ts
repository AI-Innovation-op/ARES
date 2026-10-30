/**
 * @fileoverview Servicio Frontend para la Forja de Ejercicios y Autómata Git DDD (v3.5).
 * Comunica la interfaz con la API de desofuscación, forja de arquitectura y empaquetado .ZIP.
 * @module services/assignment.service
 */

import axios from 'axios';
import { API_BASE_ORIGIN } from './http.js';
import JSZip from 'jszip';

export interface BoundedContextMeta {
  nombre: string;
  identificador: string;
  descripcion: string;
  entidades: string[];
  casosUso: string[];
}

export interface AnalisisEnunciado {
  titulo: string;
  slug: string;
  resumenNegocio: string;
  boundedContexts: BoundedContextMeta[];
  entidadesClave: string[];
  valueObjects: string[];
  reglasNegocio: string[];
  casosUso: string[];
  eventosDominio: string[];
  stackSugerido: string;
  especificacionMarkdown: string;
  estadisticasLimpieza: {
    longitudOriginal: number;
    longitudLimpia: number;
    palabrasReparadas: number;
    lineasRuidoEliminadas: number;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedContexts?: string[];
  color?: string;
}

export interface MetricaContribucionEquipo {
  miembro: TeamMember;
  commitsAsignados: number;
  porcentaje: number;
  boundedContexts: string[];
}

export interface CommitSlice {
  id: string;
  orden: number;
  mensaje: string;
  tipo: 'chore' | 'feat' | 'test' | 'docs';
  boundedContext?: string;
  archivos: string[];
  autor: string;
  autorNombre?: string;
  autorEmail?: string;
}

export interface ArchivoGenerado {
  ruta: string;
  contenido: string;
}

export interface GitAuthorConfig {
  name: string;
  email: string;
  branchName?: string;
  remoteUrl?: string;
  githubToken?: string;
  teamMembers?: TeamMember[];
}

export interface PlanGitCommits {
  branchName: string;
  autor: GitAuthorConfig;
  commits: CommitSlice[];
  metricasEquipo?: MetricaContribucionEquipo[];
  scripts: {
    bat: string;
    sh: string;
  };
}

export interface ProyectoForjado {
  titulo: string;
  slug: string;
  archivos: ArchivoGenerado[];
  planGit: PlanGitCommits;
  readmeHumanizado: string;
  especificacionMarkdown: string;
  boundedContexts: string[];
}

export interface ResultadoGitPush {
  exitoso: boolean;
  commitsEjecutados: number;
  rama: string;
  remoteUrl?: string;
  logs: string[];
  error?: string;
  commitHashes: string[];
}

export interface StackOption {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
}

class AssignmentService {
  private baseUrl = API_BASE_ORIGIN;

  async limpiarTexto(text: string, stack?: string): Promise<AnalisisEnunciado> {
    const res = await axios.post(`${this.baseUrl}/api/assignment/clean-text`, { text, stack });
    return res.data.analysis;
  }

  async forjarProyecto(params: {
    text?: string;
    analysis?: AnalisisEnunciado;
    author: GitAuthorConfig;
    stack?: string;
  }): Promise<ProyectoForjado> {
    const res = await axios.post(`${this.baseUrl}/api/assignment/forge`, params);
    return res.data.project;
  }

  async ejecutarGitPush(files: ArchivoGenerado[], plan: PlanGitCommits): Promise<ResultadoGitPush> {
    const res = await axios.post(`${this.baseUrl}/api/assignment/execute-git`, { files, plan });
    return res.data.result;
  }

  async listarStacks(): Promise<StackOption[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/assignment/stacks`);
      return res.data.stacks;
    } catch {
      return [
        {
          id: 'typescript-ddd',
          nombre: 'TypeScript + Node.js (DDD Hexagonal)',
          descripcion: 'Clean Architecture canónica con capas Domain, Application e Infrastructure.',
          icono: '🛡️',
        },
        {
          id: 'vite-vue-ts',
          nombre: 'Vite + Vue 3 + TypeScript',
          descripcion: 'Frontend modular reactivo con componentes estructurados por Bounded Contexts.',
          icono: '⚡',
        },
        {
          id: 'express-hexagonal',
          nombre: 'Express + TypeScript Hexagonal',
          descripcion: 'API REST robusta con controladores adaptadores e inyección de dependencias.',
          icono: '⚔️',
        },
      ];
    }
  }

  async descargarProyectoZip(archivos: ArchivoGenerado[], nombreZip: string): Promise<void> {
    const zip = new JSZip();

    for (const a of archivos) {
      const rutaNormalizada = a.ruta.replace(/\\/g, '/');
      zip.file(rutaNormalizada, a.contenido);
    }

    const contenidoBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const url = URL.createObjectURL(contenidoBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreZip.endsWith('.zip') ? nombreZip : `${nombreZip}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const assignmentService = new AssignmentService();
