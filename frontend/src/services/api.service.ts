/**
 * @fileoverview Cliente API para comunicar el frontend de A.R.E.S. con el backend Express.
 * @module services/api.service
 */

import axios from 'axios';
import type {
  RespuestaChat,
  RespuestaAuditoria,
  RespuestaDocumento,
  TipoDocumento,
  EstadoBio,
  Postura,
  NumeroPose,
} from '../types/ares.types.js';

// Enlace táctico del backend: si estamos en Render u otro dominio público, apunta al backend en la nube
const RENDER_BACKEND_URL = 'https://ares-backend-ozs5.onrender.com';
export const API_BASE_ORIGIN =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname.includes('render.com') || window.location.hostname.includes('onrender.com'))
    ? RENDER_BACKEND_URL
    : '');

const cliente = axios.create({
  baseURL: `${API_BASE_ORIGIN}/api`,
  timeout: 60_000, // 60s para razonamiento profundo de Gemini / DeepSeek
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  /**
   * Envía un mensaje a la consola táctica de A.R.E.S. en modo streaming SSE.
   * Transmite tokens progresivamente conforme Gemini razona.
   */
  async enviarMensajeChatStream(params: {
    message: string;
    conversationId?: string;
    imageBase64?: string;
    provider?: 'gemini' | 'openrouter';
    model?: string;
    onInit?: (data: { stance: Postura; poseNumber: NumeroPose; conversationId: string }) => void;
    onChunk?: (chunk: string, poseDetected?: NumeroPose) => void;
    onDone?: (data: { reply: string; stance: Postura; poseNumber: NumeroPose; conversationId: string }) => void;
    onError?: (error: Error) => void;
  }): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_ORIGIN}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: params.message,
          conversationId: params.conversationId,
          imageBase64: params.imageBase64,
          provider: params.provider,
          model: params.model,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Falla HTTP al conectar flujo de stream (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.type === 'init' && params.onInit) {
                params.onInit(data);
              } else if (data.type === 'chunk' && params.onChunk) {
                params.onChunk(data.text, data.poseDetected);
              } else if (data.type === 'done' && params.onDone) {
                params.onDone(data);
              } else if (data.type === 'error' && params.onError) {
                params.onError(new Error(data.message));
              }
            } catch (err) {
              console.warn('⚠️ [Stream SSE] Error al parsear paquete de datos:', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (params.onError) {
        params.onError(err);
      } else {
        throw err;
      }
    }
  },

  /**
   * Envía un mensaje a la consola táctica de A.R.E.S. (bloqueante / no-stream).
   */
  async enviarMensajeChat(params: {
    message: string;
    conversationId?: string;
    imageBase64?: string;
  }): Promise<RespuestaChat> {
    const { data } = await cliente.post<RespuestaChat>('/chat', params);
    return data;
  },

  /**
   * Forja documentación técnica con el Escudo Aegis.
   */
  async forjarDocumento(params: {
    docType: TipoDocumento;
    sourceContext: string;
    repositoryId?: string;
    title?: string;
  }): Promise<RespuestaDocumento> {
    const { data } = await cliente.post<RespuestaDocumento>('/documents/generate', params);
    return data;
  },

  /**
   * Audita código con la Espada Binaria (SOLID, Big-O, OWASP).
   */
  async auditarCodigo(params: {
    language: string;
    code: string;
    repositoryId?: string;
  }): Promise<RespuestaAuditoria> {
    const { data } = await cliente.post<RespuestaAuditoria>('/audit', params);
    return data;
  },

  /**
   * Consulta el estado de telemetría biométrica del Comandante.
   */
  async consultarBio(params: {
    commanderId?: string;
    minutos: number;
    agua: number;
    penalizacion: number;
    bono: number;
  }): Promise<EstadoBio> {
    const cid = params.commanderId ?? 'default-commander';
    const { data } = await cliente.get<EstadoBio>(`/bio/${cid}`, {
      params: {
        minutos: params.minutos,
        agua: params.agua,
        penalizacion: params.penalizacion,
        bono: params.bono,
      },
    });
    return data;
  },

  /**
   * Genera una suite de pruebas unitarias mediante el Test Forge Táctico.
   */
  async generarPruebas(params: {
    code: string;
    language: string;
    framework: string;
    focus?: string;
  }): Promise<{ testCode: string; framework: string; summary: string }> {
    const { data } = await cliente.post<{ testCode: string; framework: string; summary: string }>(
      '/tests/generate',
      params
    );
    return data;
  },

  /**
   * Ejecuta una herramienta estructurada (Function Calling).
   */
  async ejecutarHerramienta(toolName: string, args: Record<string, any>): Promise<any> {
    const { data } = await cliente.post('/tools/execute', { toolName, args });
    return data;
  },

  /**
   * Comprueba si el backend está en línea.
   */
  async verificarSalud(): Promise<boolean> {
    try {
      const { data } = await axios.get(`${API_BASE_ORIGIN}/health`, { timeout: 3000 });
      return data?.status === 'ONLINE';
    } catch {
      return false;
    }
  },

  // ==========================================================================
  // Bloque 3: Persistencia y Memoria Total (SQLite)
  // ==========================================================================

  /**
   * Lista sesiones de conversación previas del comandante.
   */
  async listarConversaciones(limite: number = 30): Promise<any[]> {
    const { data } = await cliente.get<{ conversaciones: any[] }>('/conversations', {
      params: { limite },
    });
    return data.conversaciones;
  },

  /**
   * Obtiene los mensajes de una conversación específica.
   */
  async obtenerMensajesConversacion(id: string): Promise<{ conversacion: any; mensajes: any[] }> {
    const { data } = await cliente.get<{ conversacion: any; mensajes: any[] }>(`/conversations/${id}/messages`);
    return data;
  },

  /**
   * Crea una nueva sesión táctica en la base de datos.
   */
  async crearConversacion(title?: string): Promise<any> {
    const { data } = await cliente.post<{ conversacion: any }>('/conversations', { title });
    return data.conversacion;
  },

  /**
   * Elimina una conversación y sus mensajes.
   */
  async eliminarConversacion(id: string): Promise<void> {
    await cliente.delete(`/conversations/${id}`);
  },

  /**
   * Lista documentos guardados en la Bóveda Aegis.
   */
  async listarDocumentos(repositoryId: string = 'default', tipo?: string): Promise<any[]> {
    const { data } = await cliente.get<{ documentos: any[] }>(`/documents/${repositoryId}`, {
      params: { tipo },
    });
    return data.documentos;
  },

  /**
   * Lista auditorías previas de la Espada Binaria.
   */
  async listarAuditorias(repositoryId: string = 'default'): Promise<any[]> {
    const { data } = await cliente.get<{ auditorias: any[] }>(`/audit/${repositoryId}`);
    return data.auditorias;
  },

  /**
   * Obtiene la última telemetría biométrica persistida.
   */
  async obtenerUltimaTelemetria(commanderId: string = 'default'): Promise<any> {
    const { data } = await cliente.get<{ telemetria: any }>(`/bio/${commanderId}/latest`);
    return data.telemetria;
  },

  /**
   * Obtiene el catálogo de modelos de IA disponibles (Gemini + OpenRouter).
   */
  async obtenerModelos(): Promise<any[]> {
    const { data } = await cliente.get<{ models: any[] }>('/models');
    return data.models;
  },
};
