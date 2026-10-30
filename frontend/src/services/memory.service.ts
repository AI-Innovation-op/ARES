import { apiFetch } from './http.js';
/**
 * @fileoverview Cliente API Frontend para el Oráculo de Memoria Semántica Vectorial Local (A.R.E.S. v3.3).
 * @module services/memory.service
 */

export type MemoryCollection = 'adr' | 'code_snippet' | 'openapi' | 'system_design' | 'security_rule' | 'general';

export interface ArchitecturalMemory {
  id: string;
  collection: MemoryCollection;
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, any>;
  similarityScore?: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  query: string;
  totalEncontrados: number;
  resultados: ArchitecturalMemory[];
  tiempoBusquedaMs: number;
}

export interface MemoryStats {
  totalMemorias: number;
  dimensionVectorial: number;
  porColeccion: Record<string, number>;
  totalTags: number;
  ultimaActualizacion: string;
}

export class MemoryFrontendService {
  /**
   * Lista todas las memorias registradas.
   */
  public static async listarMemorias(coleccion?: MemoryCollection): Promise<ArchitecturalMemory[]> {
    const url = coleccion ? `/api/memory?collection=${coleccion}` : `/api/memory`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error('Error al listar memorias');
    const data = await res.json();
    return data.memorias;
  }

  /**
   * Guarda una nueva memoria arquitectónica con vectorización inmediata.
   */
  public static async guardarMemoria(datos: {
    id?: string;
    collection: MemoryCollection;
    title: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<ArchitecturalMemory> {
    const res = await apiFetch(`/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    if (!res.ok) throw new Error('Error al guardar la memoria');
    return await res.json();
  }

  /**
   * Ejecuta búsqueda semántica por similitud de cosenos.
   */
  public static async buscarSemantica(
    query: string,
    threshold: number = 0.55,
    limit: number = 6,
    collection?: MemoryCollection
  ): Promise<SearchResult> {
    const res = await apiFetch(`/api/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, threshold, limit, collection }),
    });
    if (!res.ok) throw new Error('Error en la búsqueda semántica');
    return await res.json();
  }

  /**
   * Elimina una memoria por ID.
   */
  public static async eliminarMemoria(id: string): Promise<boolean> {
    const res = await apiFetch(`/api/memory/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Error al eliminar la memoria ${id}`);
    const data = await res.json();
    return data.success;
  }

  /**
   * Obtiene estadísticas del oráculo vectorial.
   */
  public static async obtenerEstadisticas(): Promise<MemoryStats> {
    const res = await apiFetch(`/api/memory/stats`);
    if (!res.ok) throw new Error('Error al obtener estadísticas de memoria');
    return await res.json();
  }
}
