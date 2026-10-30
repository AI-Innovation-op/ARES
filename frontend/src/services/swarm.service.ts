/**
 * @fileoverview Servicio de cliente para el Enjambre de Subagentes Especializados (Multi-Agent Swarm) v3.1.
 * Conecta el frontend con la API táctica del enjambre.
 * @module services/swarm.service
 */

import axios from 'axios';
import { API_BASE_ORIGIN } from './http.js';

export interface SubagenteFrontend {
  id: string;
  nombre: string;
  titulo: string;
  icono: string;
  color: string;
  rol: string;
  especialidad: string;
  modeloSugerido: string;
  systemPrompt: string;
}

export interface RespuestaAgentesSwarm {
  swarmVersion: string;
  totalAgents: number;
  agents: SubagenteFrontend[];
}

export interface SwarmMissionResult {
  texto: string;
  subagentes: SubagenteFrontend[];
  veredicto: string;
}

class SwarmService {
  private agentesCache: SubagenteFrontend[] = [];

  /**
   * Obtiene la lista de subagentes tácticos disponibles desde el backend.
   */
  async obtenerSubagentes(): Promise<SubagenteFrontend[]> {
    if (this.agentesCache.length > 0) {
      return this.agentesCache;
    }

    try {
      const { data } = await axios.get<RespuestaAgentesSwarm>(`${API_BASE_ORIGIN}/api/swarm/agents`);
      this.agentesCache = data.agents;
      return data.agents;
    } catch (error) {
      console.warn('⚠️ [SwarmService] Error al obtener subagentes desde backend, usando respaldo local:', error);
      return this.obtenerSubagentesFallback();
    }
  }

  /**
   * Ejecuta una misión del enjambre de forma síncrona.
   */
  async ejecutarMision(mision: string, provider?: string, model?: string): Promise<SwarmMissionResult> {
    const { data } = await axios.post<SwarmMissionResult>(`${API_BASE_ORIGIN}/api/swarm/execute`, {
      mission: mision,
      provider,
      model,
    });
    return data;
  }

  /**
   * Respaldo local de la legión de subagentes en caso de desconexión momentánea.
   */
  obtenerSubagentesFallback(): SubagenteFrontend[] {
    return [
      {
        id: 'atenea',
        nombre: 'Atenea',
        titulo: 'Arquitecto de Sistemas & Modelado DDD',
        icono: '🏛️',
        color: '#a855f7',
        rol: 'Diseño de arquitectura, límites de contexto, aggregates, entidades y diagramas C4.',
        especialidad: 'Domain-Driven Design (DDD), Clean Architecture, Mermaid C4, RFCs',
        modeloSugerido: 'gemini-3-flash-preview',
        systemPrompt: '',
      },
      {
        id: 'vulcano',
        nombre: 'Vulcano',
        titulo: 'Forjador Backend & Clean Architecture',
        icono: '⚔️',
        color: '#38bdf8',
        rol: 'Implementación de capas de dominio, aplicación e infraestructura en TypeScript/Node.js.',
        especialidad: 'TypeScript, Express/Fastify, Repositorios, Use Cases, DTOs, SOLID',
        modeloSugerido: 'deepseek/deepseek-chat',
        systemPrompt: '',
      },
      {
        id: 'mercurio',
        nombre: 'Mercurio',
        titulo: 'Ingeniero UI/UX Frontend & Live Preview',
        icono: '🎨',
        color: '#00ffaa',
        rol: 'Construcción de interfaces reactivas en Vue 3 + Tailwind CSS listas para Live Preview en tiempo real.',
        especialidad: 'Vue 3 Composition API, Pinia, Tailwind CSS, Responsive Design, Live Sandbox',
        modeloSugerido: 'gemini-3-flash-preview',
        systemPrompt: '',
      },
      {
        id: 'nemesis',
        nombre: 'Némesis',
        titulo: 'Centinela QA, Seguridad OWASP & Consenso',
        icono: '🧪',
        color: '#f59e0b',
        rol: 'Auditoría estricta de seguridad, cálculo de deuda técnica, pruebas unitarias y veredicto de consenso.',
        especialidad: 'Vitest/Jest, OWASP Top 10, Complejidad Big-O, SOLID Score, Veredictos de Calidad',
        modeloSugerido: 'anthropic/claude-3.5-sonnet',
        systemPrompt: '',
      },
    ];
  }
}

export const swarmService = new SwarmService();
