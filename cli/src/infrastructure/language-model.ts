import type { LanguageModel, Message } from '../shared/application/ports.js';
import { AresError } from '../shared/domain/errors.js';
import { requireAi, type Configuration } from './configuration.js';
import { readBoundedText } from './http-body.js';

/** SSE frames can span network chunks, UTF-8 codepoints and multiple data lines. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let data: string[] = [];
  let eventSize = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 2_000_000)
        throw new AresError('PROVIDER', 'Evento SSE demasiado grande.');
      let index: number;
      while ((index = buffer.search(/[\r\n]/)) >= 0) {
        if (buffer[index] === '\r' && index === buffer.length - 1 && !done) break;
        const line = buffer.slice(0, index);
        const separator = buffer[index] === '\r' && buffer[index + 1] === '\n' ? 2 : 1;
        buffer = buffer.slice(index + separator);
        if (line === '') {
          if (data.length) {
            yield data.join('\n');
            data = [];
            eventSize = 0;
          }
        } else if (line.startsWith('data:')) {
          eventSize += line.length;
          if (eventSize > 2_000_000)
            throw new AresError('PROVIDER', 'Evento SSE demasiado grande.');
          data.push(line.slice(5).replace(/^ /, ''));
        }
      }
      if (done) {
        if (buffer.startsWith('data:'))
          data.push(buffer.slice(5).replace(/^ /, '').replace(/\r$/, ''));
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
  choices?: {
    delta?: { content?: unknown };
    message?: { content?: unknown };
    finish_reason?: string | null;
  }[];
};

function parseChunk(text: string): CompletionChunk {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AresError('PROVIDER', 'JSON inválido del proveedor.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new AresError('PROVIDER', 'Formato de respuesta inválido del proveedor.');
  const chunk = parsed as CompletionChunk;
  if (chunk.error !== undefined && chunk.error !== null)
    throw new AresError('PROVIDER', 'El proveedor devolvió un error durante la generación.');
  if (chunk.choices !== undefined && !Array.isArray(chunk.choices))
    throw new AresError('PROVIDER', 'Lista de respuestas inválida del proveedor.');
  return chunk;
}

function checkFinish(reason: string | null | undefined): void {
  if (reason === 'length')
    throw new AresError(
      'PROVIDER',
      'Respuesta truncada por límite de tokens. Aumenta ARES_MAX_TOKENS.',
    );
  if (reason === 'content_filter')
    throw new AresError('PROVIDER', 'El proveedor filtró la respuesta.');
  if (reason && reason !== 'stop')
    throw new AresError('PROVIDER', 'El proveedor terminó sin una respuesta de texto completa.');
}

export class CompatibleLanguageModel implements LanguageModel {
  readonly name: string;
  constructor(
    private readonly config: Configuration,
    private readonly request: typeof fetch = fetch,
  ) {
    this.name = `${config.provider}/${config.model}`;
  }

  async *stream(messages: readonly Message[], signal?: AbortSignal): AsyncIterable<string> {
    requireAi(this.config);
    const timeout = AbortSignal.timeout(this.config.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let emitted = 0;
    try {
      const response = await this.request(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        redirect: 'error',
        signal: combined,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
          max_tokens: this.config.maxTokens,
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        const advice =
          response.status === 401 || response.status === 403
            ? 'Revisa la clave y sus permisos.'
            : response.status === 429
              ? 'Límite de uso: espera o revisa tu cuota.'
              : 'Revisa el modelo, el endpoint y el estado del proveedor.';
        throw new AresError('PROVIDER', `Proveedor HTTP ${response.status}. ${advice}`);
      }
      if (!response.body) throw new AresError('PROVIDER', 'El proveedor no devolvió contenido.');
      let finished = false;
      if (response.headers.get('content-type')?.includes('application/json')) {
        const text = await readBoundedText(response.body, 1_000_000);
        const parsed = parseChunk(text);
        const choice = parsed.choices?.[0];
        checkFinish(choice?.finish_reason);
        const content = choice?.message?.content;
        if (typeof content === 'string') {
          emitted += content.length;
          yield content;
          finished = true;
        }
      } else {
        for await (const data of sseData(response.body)) {
          if (data.trim() === '[DONE]') {
            finished = true;
            break;
          }
          const parsed = parseChunk(data);
          const choice = parsed.choices?.[0];
          const content = choice?.delta?.content;
          if (typeof content === 'string') {
            emitted += content.length;
            if (emitted > 1_000_000) throw new AresError('PROVIDER', 'Respuesta demasiado grande.');
            yield content;
          }
          checkFinish(choice?.finish_reason);
          if (choice?.finish_reason === 'stop') finished = true;
        }
      }
      if (!finished)
        throw new AresError(
          'PROVIDER',
          'Conexión cerrada antes de completar la respuesta; el turno no se guardó.',
        );
      if (!emitted) throw new AresError('PROVIDER', 'El proveedor devolvió una respuesta vacía.');
      combined.throwIfAborted();
    } catch (error) {
      if (signal?.aborted)
        throw new AresError('CANCELLED', 'Operación cancelada; el turno no se guardó.');
      if (timeout.aborted)
        throw new AresError('PROVIDER', `Tiempo de espera agotado (${this.config.timeoutMs} ms).`);
      if (error instanceof AresError) throw error;
      throw new AresError(
        'PROVIDER',
        'No se pudo comunicar con el proveedor. Revisa tu conexión y ARES_BASE_URL.',
      );
    }
  }
}
