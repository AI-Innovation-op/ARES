import { apiFetch } from './http.js';
/**
 * @fileoverview Cliente API Frontend para el Radar de Arquitectura C4 & Tracing de Eventos (A.R.E.S. v3.4).
 * @module services/architecture.service
 */

export type NodeType = 'client' | 'gateway' | 'service' | 'database' | 'queue' | 'cache' | 'external';
export type NodeStatus = 'healthy' | 'degraded' | 'offline';
export type ProtocolType = 'HTTP/REST' | 'SSE' | 'gRPC' | 'SQL' | 'AMQP' | 'WS';

export interface TopologyNode {
  id: string;
  nombre: string;
  tipo: NodeType;
  tecnologia: string;
  boundedContext?: string;
  capaDdd: 'presentation' | 'application' | 'domain' | 'infrastructure' | 'cross-cutting';
  status: NodeStatus;
  latenciaMs: number;
  rps: number;
  descripcion: string;
  adrVinculado?: string;
  x: number;
  y: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  protocolo: ProtocolType;
  descripcion: string;
  traficoRps: number;
  activo: boolean;
}

export interface SystemTopology {
  id: string;
  nombre: string;
  descripcion: string;
  patronArquitectonico: string;
  metricasGlobales: {
    totalRps: number;
    latenciaPromedioMs: number;
    tasaErrorPct: number;
    adherenciaSolid: number;
  };
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export class ArchitectureFrontendService {
  /**
   * Obtiene la lista de topologías disponibles.
   */
  public static async listarTopologias(): Promise<Array<{ id: string; nombre: string; descripcion: string; patronArquitectonico: string }>> {
    const res = await apiFetch(`/api/architecture/topologies`);
    if (!res.ok) throw new Error('Error al listar topologías');
    const data = await res.json();
    return data.topologias;
  }

  /**
   * Obtiene la topología activa o por ID.
   */
  public static async obtenerTopologia(id?: string): Promise<SystemTopology> {
    const url = id ? `/api/architecture/topology/${id}` : `/api/architecture/topology`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error('Error al obtener la topología');
    return await res.json();
  }

  /**
   * Simula ráfagas de tráfico sobre el sistema.
   */
  public static async simularTrafico(multiplier: number = 2.0): Promise<{ mensaje: string; topologia: SystemTopology }> {
    const res = await apiFetch(`/api/architecture/simulate-traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiplier }),
    });
    if (!res.ok) throw new Error('Error simulando tráfico');
    return await res.json();
  }

  /**
   * Inyecta caos para probar resiliencia y circuit breakers.
   */
  public static async inyectarCaos(nodoId?: string): Promise<{ nodoAfectado: string; accion: string; topologia: SystemTopology }> {
    const res = await apiFetch(`/api/architecture/inject-chaos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodoId }),
    });
    if (!res.ok) throw new Error('Error inyectando caos');
    return await res.json();
  }

  /**
   * Restaura la topología al 100% de salud.
   */
  public static async restaurar(): Promise<{ mensaje: string; topologia: SystemTopology }> {
    const res = await apiFetch(`/api/architecture/restore`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Error restaurando topología');
    return await res.json();
  }

  /**
   * Exporta a sintaxis Mermaid C4.
   */
  public static async exportarMermaidC4(id?: string): Promise<string> {
    const url = id ? `/api/architecture/export/c4?id=${id}` : `/api/architecture/export/c4`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error('Error exportando C4');
    const data = await res.json();
    return data.mermaid;
  }
}
