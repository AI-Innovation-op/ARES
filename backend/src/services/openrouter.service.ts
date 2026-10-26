/**
 * @fileoverview Adaptador de OpenRouter para A.R.E.S. v2.6 (Multi-Modelo).
 * Permite alternar y consultar modelos de Anthropic (Claude 3.5), OpenAI (GPT-4o),
 * DeepSeek (V3, R1) y Meta (Llama 3.3).
 * @module services/openrouter.service
 */

import { env } from '../config/env.js';

export interface MensajeOpenRouter {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SolicitudOpenRouter {
  messages: MensajeOpenRouter[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface RespuestaOpenRouter {
  texto: string;
  modelUsado: string;
}

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Invoca OpenRouter en modo completado síncrono.
 */
export async function invocarOpenRouter(
  solicitud: SolicitudOpenRouter
): Promise<RespuestaOpenRouter> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no está configurada en el entorno.');
  }

  const model = solicitud.model || env.OPENROUTER_DEFAULT_MODEL || 'deepseek/deepseek-chat';

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/AI-Innovation-op/ARES',
      'X-Title': 'A.R.E.S. Tactical AI',
    },
    body: JSON.stringify({
      model,
      messages: solicitud.messages,
      temperature: solicitud.temperature ?? 0.3,
      max_tokens: solicitud.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error en OpenRouter (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as any;
  const reply = data.choices?.[0]?.message?.content ?? '';

  return {
    texto: reply,
    modelUsado: data.model || model,
  };
}

/**
 * Invoca OpenRouter transmitiendo tokens en tiempo real mediante SSE.
 */
export async function* invocarOpenRouterStream(
  solicitud: SolicitudOpenRouter
): AsyncGenerator<string> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no está configurada en el entorno.');
  }

  const model = solicitud.model || env.OPENROUTER_DEFAULT_MODEL || 'deepseek/deepseek-chat';

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/AI-Innovation-op/ARES',
      'X-Title': 'A.R.E.S. Tactical AI',
    },
    body: JSON.stringify({
      model,
      messages: solicitud.messages,
      temperature: solicitud.temperature ?? 0.3,
      max_tokens: solicitud.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.text();
    throw new Error(`Falla al conectar stream de OpenRouter (${response.status}): ${errorBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;

      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (dataStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      } catch {
        // Ignorar paquetes intermedios no JSON
      }
    }
  }
}
