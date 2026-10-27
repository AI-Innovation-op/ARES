/**
 * @fileoverview Orquestador Multi-Modelo para A.R.E.S. v2.6.
 * Enruta consultas entre Google Gemini y OpenRouter (Claude 3.5, DeepSeek V3/R1, GPT-4o),
 * con conmutación por error (failover) automática y catálogo unificado de modelos.
 * @module services/llm.service
 */

import { invocarGemini, invocarGeminiStream, MEGA_PROMPT_ARES } from './gemini.service.js';
import { invocarOpenRouter, invocarOpenRouterStream, type MensajeOpenRouter } from './openrouter.service.js';
import { AiRouterService, type ResultadoInvocacionResiliente } from './ai-router.service.js';
import { env } from '../config/env.js';
import type { ContenidoGemini } from '../types/gemini.types.js';

export type ProveedorLLM = 'gemini' | 'openrouter' | 'auto';

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
    id: 'auto',
    nombre: '🤖 AUTO: Enrutamiento Inteligente & Failover',
    proveedor: 'auto',
    descripcion: 'Analiza tu consulta y elige automáticamente la mejor IA (DeepSeek R1 para lógica/DDD, V3 para código, Gemini para velocidad) con conmutación resiliente por fallo.',
    especialidad: 'general',
    icono: '🤖',
  },
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
    id: 'deepseek/deepseek-r1',
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
  nombreModeloUsado?: string;
  iconoModeloUsado?: string;
  fuentes: Array<{ uri: string; title: string }>;
  conmutacionAutomatica?: {
    fueConmutado: boolean;
    modeloInicial: string;
    modeloFinal: string;
    motivoConmutacion?: string;
    categoria?: string;
  };
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
 * Ejecuta una consulta a través del motor Multi-Modelo con failover automático y enrutamiento inteligente.
 */
export async function invocarLLM(opciones: OpcionesConsultaLLM): Promise<RespuestaConsultaLLM> {
  const resultado = await AiRouterService.ejecutarConmutacionResiliente({
    contents: opciones.contents,
    modeloDeseado: opciones.model,
    proveedorDeseado: opciones.provider,
    systemInstruction: opciones.systemInstruction,
    enableSearch: opciones.enableSearch,
  });

  return {
    texto: resultado.texto,
    proveedorUsado: resultado.proveedorUsado,
    modeloUsado: resultado.modeloUsado,
    nombreModeloUsado: resultado.nombreModeloUsado,
    iconoModeloUsado: resultado.iconoModeloUsado,
    fuentes: resultado.fuentes,
    conmutacionAutomatica: resultado.conmutacionAutomatica,
  };
}

/**
 * Ejecuta streaming SSE a través del motor Multi-Modelo.
 */
export async function* invocarLLMStream(
  opciones: OpcionesConsultaLLM
): AsyncGenerator<string> {
  let modelTarget = opciones.model;
  let provTarget = opciones.provider || (env.LLM_PROVIDER as ProveedorLLM) || 'gemini';

  // Si se solicita modo automático o no se especificó modelo, clasificar intención
  if (!modelTarget || modelTarget === 'auto' || provTarget === 'auto') {
    const ultimoTexto = opciones.contents
      .filter((c) => c.role === 'user')
      .flatMap((c) => c.parts.map((p) => p.text || ''))
      .join(' ');
    const decision = AiRouterService.clasificarYEnrutar(ultimoTexto);
    provTarget = decision.modeloSeleccionado.proveedor;
    modelTarget = decision.modeloSeleccionado.modelo;
  }

  if (provTarget === 'openrouter') {
    const messages = transformarMensajesAOpenRouter(opciones.contents, opciones.systemInstruction);
    yield* invocarOpenRouterStream({
      messages,
      model: modelTarget || env.OPENROUTER_DEFAULT_MODEL,
    });
    return;
  }

  // Streaming con Gemini
  try {
    yield* invocarGeminiStream({
      contents: opciones.contents,
      systemInstruction: opciones.systemInstruction,
      model: modelTarget,
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
