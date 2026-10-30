import type { LanguageModel, Message } from '../shared/application/ports.js';
import { AresError } from '../shared/domain/errors.js';
import { requireAi, type Configuration } from './configuration.js';

/** SSE frames can span network chunks, UTF-8 codepoints and multiple data lines. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let data: string[] = [];
  let eventSize = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 2_000_000) throw new AresError('PROVIDER', 'Evento SSE demasiado grande.');
      let index: number;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (line === '') {
          if (data.length) { yield data.join('\n'); data = []; eventSize = 0; }
        } else if (line.startsWith('data:')) {
          eventSize += line.length;
          if (eventSize > 2_000_000) throw new AresError('PROVIDER', 'Evento SSE demasiado grande.');
          data.push(line.slice(5).replace(/^ /, ''));
        }
      }
      if (done) {
        if (buffer.startsWith('data:')) data.push(buffer.slice(5).replace(/^ /, '').replace(/\r$/, ''));
        if (data.length) yield data.join('\n');
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

type CompletionChunk = {
  error?: unknown;
  choices?: { delta?: { content?: unknown }; message?: { content?: unknown }; finish_reason?: string | null }[];
};

export class CompatibleLanguageModel implements LanguageModel {
  readonly name: string;
  constructor(private readonly config: Configuration, private readonly request: typeof fetch = fetch) {
    this.name = `${config.provider}/${config.model}`;
  }

  async *stream(messages: readonly Message[], signal?: AbortSignal): AsyncIterable<string> {
    requireAi(this.config);
    const timeout = AbortSignal.timeout(this.config.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let emitted = 0;
    try {
      const response = await this.request(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST', redirect: 'error', signal: combined,
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) },
        body: JSON.stringify({ model: this.config.model, messages, stream: true, max_tokens: this.config.maxTokens }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        const advice = response.status === 401 || response.status === 403 ? 'Revisa la clave y sus permisos.' : response.status === 429 ? 'Límite de uso: espera o revisa tu cuota.' : 'Revisa el modelo, el endpoint y el estado del proveedor.';
        throw new AresError('PROVIDER', `Proveedor HTTP ${response.status}. ${advice}`);
      }
      if (!response.body) throw new AresError('PROVIDER', 'El proveedor no devolvió contenido.');
      let finished = false;
      if (response.headers.get('content-type')?.includes('application/json')) {
        const text = await response.text();
        if (text.length > 1_000_000) throw new AresError('PROVIDER', 'Respuesta demasiado grande.');
        const parsed = JSON.parse(text) as CompletionChunk;
        if (parsed.error) throw new AresError('PROVIDER', 'El proveedor devolvió un error.');
        const choice = parsed.choices?.[0];
        if (choice?.finish_reason === 'length') throw new AresError('PROVIDER', 'Respuesta truncada por límite de tokens. Aumenta ARES_MAX_TOKENS.');
        const content = choice?.message?.content;
        if (typeof content === 'string') { emitted += content.length; yield content; finished = true; }
      } else {
        for await (const data of sseData(response.body)) {
          if (data.trim() === '[DONE]') { finished = true; break; }
          let parsed: CompletionChunk;
          try { parsed = JSON.parse(data) as CompletionChunk; } catch { throw new AresError('PROVIDER', 'Evento SSE inválido del proveedor.'); }
          if (parsed.error) throw new AresError('PROVIDER', 'El proveedor interrumpió la generación con un error.');
          const choice = parsed.choices?.[0];
          const content = choice?.delta?.content;
          if (typeof content === 'string') {
            emitted += content.length;
            if (emitted > 1_000_000) throw new AresError('PROVIDER', 'Respuesta demasiado grande.');
            yield content;
          }
          if (choice?.finish_reason === 'length') throw new AresError('PROVIDER', 'Respuesta truncada por límite de tokens. Aumenta ARES_MAX_TOKENS.');
          if (choice?.finish_reason === 'content_filter') throw new AresError('PROVIDER', 'El proveedor filtró la respuesta.');
          if (choice?.finish_reason === 'stop') finished = true;
        }
      }
      if (!finished) throw new AresError('PROVIDER', 'Conexión cerrada antes de completar la respuesta; el turno no se guardó.');
      if (!emitted) throw new AresError('PROVIDER', 'El proveedor devolvió una respuesta vacía.');
      combined.throwIfAborted();
    } catch (error) {
      if (signal?.aborted) throw new AresError('CANCELLED', 'Operación cancelada; el turno no se guardó.');
      if (timeout.aborted) throw new AresError('PROVIDER', `Tiempo de espera agotado (${this.config.timeoutMs} ms).`);
      if (error instanceof AresError) throw error;
      throw new AresError('PROVIDER', 'No se pudo comunicar con el proveedor. Revisa tu conexión y ARES_BASE_URL.');
    }
  }
}
