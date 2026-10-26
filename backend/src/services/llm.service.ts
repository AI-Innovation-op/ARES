/**
 * @fileoverview Orquestador Multi-Modelo para A.R.E.S. v2.6.
 * Enruta consultas entre Google Gemini y OpenRouter (Claude 3.5, DeepSeek V3/R1, GPT-4o),
 * con conmutación por error (failover) automática y catálogo unificado de modelos.
 * @module services/llm.service
 */

import { invocarGemini, invocarGeminiStream, MEGA_PROMPT_ARES } from './gemini.service.js';
import { invocarOpenRouter, invocarOpenRouterStream, type MensajeOpenRouter } from './openrouter.service.js';
import { env } from '../config/env.js';
import type { ContenidoGemini } from '../types/gemini.types.js';

export type ProveedorLLM = 'gemini' | 'openrouter';

export interface ModeloDisponible {
  id: string;
  nombre: string;
  proveedor: ProveedorLLM;
  descripcion: string;
  especialidad: 'codigo' | 'razonamiento' | 'general' | 'rapido';
  icono: string;
}

export const CATALOGO_MODELOS: ModeloDisponible[] = [
  {
    id: 'gemini-3-flash-preview',
    nombre: 'Gemini 3 Flash (Google)',
    proveedor: 'gemini',
    descripcion: 'Modelo insignia de Google con soporte multimodal, visión táctica y Grounding de búsqueda en vivo.',
    especialidad: 'general',
    icono: '🟣',
  },
  {
    id: 'deepseek/deepseek-chat',
    nombre: 'DeepSeek V3 (OpenRouter)',
    proveedor: 'openrouter',
    descripcion: 'Modelo ultra veloz y de bajo coste optimizado para generación y refactorización de código.',
    especialidad: 'codigo',
    icono: '⚡',
  },
  {
    id: 'deepseek/deepseek-r1-0528',
    nombre: 'DeepSeek R1 Reasoning (OpenRouter)',
    proveedor: 'openrouter',
    descripcion: 'Modelo de razonamiento lógico profundo paso a paso para auditorías complejas y arquitectura.',
    especialidad: 'razonamiento',
    icono: '🧠',
  },
  {
    id: 'openai/gpt-4o',
    nombre: 'GPT-4o (OpenAI via OpenRouter)',
    proveedor: 'openrouter',
    descripcion: 'Modelo multimodal de OpenAI con alta capacidad de comprensión sintáctica y generación técnica.',
    especialidad: 'general',
    icono: '🟢',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    nombre: 'Claude 3.5 Sonnet (Anthropic via OpenRouter)',
    proveedor: 'openrouter',
    descripcion: 'Líder de la industria en arquitectura de software, razonamiento abstracto y Clean Code.',
    especialidad: 'codigo',
    icono: '🟠',
  },
];

export interface OpcionesConsultaLLM {
  contents: ContenidoGemini[];
  provider?: ProveedorLLM;
  model?: string;
  enableSearch?: boolean;
  systemInstruction?: string;
}

export interface RespuestaConsultaLLM {
  texto: string;
  proveedorUsado: ProveedorLLM;
  modeloUsado: string;
  fuentes: Array<{ uri: string; title: string }>;
}

/**
 * Convierte el historial de ContenidoGemini al formato estándar de mensajes de OpenRouter.
 */
function transformarMensajesAOpenRouter(
  contents: ContenidoGemini[],
  systemInstruction?: string
): MensajeOpenRouter[] {
  const messages: MensajeOpenRouter[] = [
    {
      role: 'system',
      content: systemInstruction || MEGA_PROMPT_ARES,
    },
  ];

  for (const c of contents) {
    const role = c.role === 'user' ? 'user' : 'assistant';
    const textPart = c.parts.map((p) => p.text || '').filter(Boolean).join('\n');
    if (textPart) {
      messages.push({ role, content: textPart });
    }
  }

  return messages;
}

/**
 * Ejecuta una consulta a través del motor Multi-Modelo con failover automático.
 */
export async function invocarLLM(opciones: OpcionesConsultaLLM): Promise<RespuestaConsultaLLM> {
  const proveedor = opciones.provider || (env.LLM_PROVIDER as ProveedorLLM) || 'gemini';

  // 1. Si el proveedor solicitado es OpenRouter
  if (proveedor === 'openrouter') {
    const messages = transformarMensajesAOpenRouter(opciones.contents, opciones.systemInstruction);
    const res = await invocarOpenRouter({
      messages,
      model: opciones.model || env.OPENROUTER_DEFAULT_MODEL,
    });
    return {
      texto: res.texto,
      proveedorUsado: 'openrouter',
      modeloUsado: res.modelUsado,
      fuentes: [],
    };
  }

  // 2. Si el proveedor es Gemini (con failover automático a OpenRouter en caso de error de cuota 429)
  try {
    const res = await invocarGemini({
      contents: opciones.contents,
      enableSearch: opciones.enableSearch ?? true,
    });
    return {
      texto: res.texto,
      proveedorUsado: 'gemini',
      modeloUsado: env.GEMINI_TEXT_MODEL || 'gemini-3-flash-preview',
      fuentes: res.fuentes,
    };
  } catch (error: any) {
    // Si Gemini falla por cuota (429) y OpenRouter está configurado, conmutar elegantemente
    if (env.OPENROUTER_API_KEY && (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota'))) {
      console.warn('⚠️ [LLMGateway] Cuota de Gemini agotada. Conmutando automáticamente a OpenRouter (DeepSeek V3)...');
      const messages = transformarMensajesAOpenRouter(opciones.contents, opciones.systemInstruction);
      const resOR = await invocarOpenRouter({
        messages,
        model: env.OPENROUTER_DEFAULT_MODEL,
      });
      return {
        texto: resOR.texto,
        proveedorUsado: 'openrouter',
        modeloUsado: resOR.modelUsado,
        fuentes: [],
      };
    }
    throw error;
  }
}

/**
 * Ejecuta streaming SSE a través del motor Multi-Modelo.
 */
export async function* invocarLLMStream(
  opciones: OpcionesConsultaLLM
): AsyncGenerator<string> {
  const proveedor = opciones.provider || (env.LLM_PROVIDER as ProveedorLLM) || 'gemini';

  if (proveedor === 'openrouter') {
    const messages = transformarMensajesAOpenRouter(opciones.contents, opciones.systemInstruction);
    yield* invocarOpenRouterStream({
      messages,
      model: opciones.model || env.OPENROUTER_DEFAULT_MODEL,
    });
    return;
  }

  // Streaming con Gemini
  try {
    yield* invocarGeminiStream({
      contents: opciones.contents,
    });
  } catch (error: any) {
    // Failover a OpenRouter en streaming
    if (env.OPENROUTER_API_KEY && (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota'))) {
      console.warn('⚠️ [LLMGateway Stream] Cuota de Gemini agotada. Conmutando a OpenRouter en streaming...');
      const messages = transformarMensajesAOpenRouter(opciones.contents, opciones.systemInstruction);
      yield* invocarOpenRouterStream({
        messages,
        model: env.OPENROUTER_DEFAULT_MODEL,
      });
      return;
    }
    throw error;
  }
}
