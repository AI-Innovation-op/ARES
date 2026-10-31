import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { LocalEngine } from '../inference/application/local-engine.js';
import { prepareLocal } from '../inference/application/local-engine.js';
import type { LocalModelInfo, LocalResources } from '../inference/domain/local-budget.js';
import type { LanguageModel, Message, ModelUsage } from '../shared/application/ports.js';
import { AresError } from '../shared/domain/errors.js';
import type { Configuration } from './configuration.js';
import { readBoundedText } from './http-body.js';

const execute = promisify(execFile);
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AresError('PROVIDER', 'Respuesta local inválida.');
  return value as Record<string, unknown>;
}
export async function localResources(): Promise<LocalResources> {
  let gpuMemoryBytes: number | undefined, gpuFreeBytes: number | undefined;
  try {
    const executable =
      process.platform === 'win32'
        ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'nvidia-smi.exe')
        : 'nvidia-smi';
    const { stdout } = await execute(
      executable,
      ['--query-gpu=memory.total,memory.free', '--format=csv,noheader,nounits'],
      { timeout: 2500, maxBuffer: 8192, windowsHide: true },
    );
    const rows = stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(',').map(Number))
      .filter((row) => row.length === 2 && row.every(Number.isFinite));
    const best = rows.sort((a, b) => b[1] - a[1])[0];
    if (best) {
      gpuMemoryBytes = best[0] * 1024 ** 2;
      gpuFreeBytes = best[1] * 1024 ** 2;
    }
  } catch {
    /* NVIDIA is optional; Apple Silicon and CPU use available system memory. */
  }
  return {
    platform: process.platform,
    architecture: process.arch,
    cpuModel: os.cpus()[0]?.model,
    totalMemoryBytes: os.totalmem(),
    availableMemoryBytes: os.freemem(),
    ...(gpuMemoryBytes === undefined ? {} : { gpuMemoryBytes, gpuFreeBytes }),
  };
}

export class OllamaEngine implements LocalEngine {
  readonly baseUrl: string;
  constructor(
    baseUrl = 'http://127.0.0.1:11434',
    private readonly request: typeof fetch = fetch,
  ) {
    const url = new URL(baseUrl);
    if (
      url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !['', '/'].includes(url.pathname)
    )
      throw new AresError(
        'CONFIG',
        'Ollama local requiere http://loopback:puerto sin rutas ni credenciales.',
      );
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }
  async json(
    endpoint: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.request(this.baseUrl + endpoint, {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        signal: AbortSignal.any([AbortSignal.timeout(15000), ...(signal ? [signal] : [])]),
        headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new AresError(
          'PROVIDER',
          `Motor local HTTP ${response.status}. Comprueba ollama serve y ollama list.`,
        );
      }
      const data: unknown = JSON.parse(await readBoundedText(response.body!, 4_000_000));
      return record(data);
    } catch (error) {
      if (signal?.aborted) throw new AresError('CANCELLED', 'Consulta local cancelada.');
      if (error instanceof AresError) throw error;
      throw new AresError(
        'PROVIDER',
        'Ollama no responde o devolvió datos inválidos. Inicia ollama serve y usa ares local status.',
      );
    }
  }
  async version(signal?: AbortSignal) {
    const data = await this.json('/api/version', undefined, signal);
    if (typeof data.version !== 'string')
      throw new AresError('PROVIDER', 'Versión local inválida.');
    return data.version;
  }
  async models(signal?: AbortSignal): Promise<readonly Omit<LocalModelInfo, 'maxContext'>[]> {
    const data = await this.json('/api/tags', undefined, signal);
    if (!Array.isArray(data.models) || data.models.length > 1000)
      throw new AresError('PROVIDER', 'Catálogo local inválido.');
    return data.models
      .filter((m) => m && typeof m === 'object' && !Array.isArray(m))
      .map(record)
      .filter(
        (m) =>
          typeof m.name === 'string' &&
          m.name.length <= 200 &&
          !/[\x00-\x1f\x7f]/.test(m.name) &&
          typeof m.digest === 'string' &&
          typeof m.size === 'number' &&
          Number.isFinite(m.size) &&
          m.size > 0 &&
          !m.remote_model &&
          !m.remote_host &&
          !m.name.endsWith('-cloud'),
      )
      .map((m) => ({
        name: m.name as string,
        sizeBytes: m.size as number,
        digest: m.digest as string,
      }));
  }
  async model(name: string, signal?: AbortSignal): Promise<LocalModelInfo> {
    const installed = (await this.models(signal)).find((m) => m.name === name);
    if (!installed)
      throw new AresError(
        'CONFIG',
        'Selecciona un modelo local instalado con ares local models y ares local use.',
      );
    const data = await this.json('/api/show', { model: name }, signal);
    if (
      data.remote_model ||
      data.remote_host ||
      !data.model_info ||
      typeof data.model_info !== 'object' ||
      !record(data.model_info)['general.architecture']
    )
      throw new AresError(
        'CONFIG',
        'El modelo no acredita pesos locales. El modo local rechaza modelos remotos.',
      );
    if (!Array.isArray(data.capabilities) || !data.capabilities.includes('completion'))
      throw new AresError('CONFIG', 'El modelo no admite conversación de texto.');
    const contexts = Object.entries(data.model_info)
      .filter(
        ([key, value]) =>
          key.endsWith('.context_length') && typeof value === 'number' && value >= 2048,
      )
      .map(([, value]) => value as number);
    if (!contexts.length)
      throw new AresError('PROVIDER', 'El modelo no informa su capacidad de contexto.');
    const running = await this.json('/api/ps', undefined, signal);
    if (!Array.isArray(running.models))
      throw new AresError('PROVIDER', 'Estado de modelos cargados inválido.');
    const resident = running.models
      .filter((m) => m && typeof m === 'object' && !Array.isArray(m))
      .map(record)
      .find(
        (m) =>
          m.digest === installed.digest &&
          typeof m.size_vram === 'number' &&
          Number.isFinite(m.size_vram),
      );
    return {
      ...installed,
      maxContext: Math.min(...contexts),
      ...(resident ? { residentVramBytes: Math.max(0, resident.size_vram as number) } : {}),
    };
  }
  resources() {
    return localResources();
  }
}

export class OllamaLanguageModel implements LanguageModel {
  readonly name: string;
  readonly inputBudgetBytes: number;
  readonly usage: ModelUsage = {};
  private constructor(
    private readonly config: Configuration,
    readonly prepared: Awaited<ReturnType<typeof prepareLocal>>,
    private readonly request: typeof fetch,
  ) {
    this.name = `ollama/${config.model}`;
    this.inputBudgetBytes = prepared.budget.inputBudgetBytes;
  }
  static async connect(config: Configuration, signal?: AbortSignal, request: typeof fetch = fetch) {
    const engine = new OllamaEngine(config.baseUrl, request);
    return new OllamaLanguageModel(
      config,
      await prepareLocal(engine, config.model, config.localContext, config.maxTokens, signal),
      request,
    );
  }
  async *stream(messages: readonly Message[], signal?: AbortSignal): AsyncIterable<string> {
    const size = messages.reduce((sum, m) => sum + Buffer.byteLength(m.content) + 16, 0);
    if (size > this.inputBudgetBytes)
      throw new AresError(
        'VALIDATION',
        `Entrada local demasiado grande (${size} bytes; límite conservador ${this.inputBudgetBytes}). Reduce contexto o usa un modelo con más capacidad.`,
      );
    const timeout = AbortSignal.timeout(this.config.timeoutMs);
    const combined = AbortSignal.any([timeout, ...(signal ? [signal] : [])]);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await this.request(this.config.baseUrl + '/api/chat', {
        method: 'POST',
        redirect: 'error',
        signal: combined,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
          think: false,
          keep_alive: '5m',
          options: {
            num_ctx: this.prepared.budget.contextTokens,
            num_predict: this.prepared.budget.outputTokens,
            temperature: 0,
          },
        }),
      });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new AresError(
          'PROVIDER',
          `Inferencia local HTTP ${response.status}. Comprueba memoria y motor.`,
        );
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let buffer = '',
        finished = false,
        emitted = 0;
      while (!finished) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        if (buffer.length > 2_000_000)
          throw new AresError('PROVIDER', 'Evento local demasiado grande.');
        if (done && buffer.trim()) buffer += '\n';
        let index;
        while ((index = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 1);
          if (!line) continue;
          const data = JSON.parse(line);
          if (!data || typeof data !== 'object' || data.error)
            throw new AresError('PROVIDER', 'El motor local devolvió un error de generación.');
          if (typeof data.message?.content === 'string') {
            emitted += data.message.content.length;
            if (emitted > 1_000_000)
              throw new AresError('PROVIDER', 'Respuesta local demasiado grande.');
            yield data.message.content;
          }
          if (data.done === true) {
            if (data.done_reason !== 'stop')
              throw new AresError(
                'PROVIDER',
                'Respuesta local incompleta o truncada; aumenta el límite de salida o reduce la tarea.',
              );
            for (const [key, value] of Object.entries({
              inputTokens: data.prompt_eval_count,
              outputTokens: data.eval_count,
              generationMs:
                typeof data.eval_duration === 'number' ? data.eval_duration / 1e6 : undefined,
              loadMs: typeof data.load_duration === 'number' ? data.load_duration / 1e6 : undefined,
            }))
              if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
                this.usage[key as keyof ModelUsage] = value;
            finished = true;
            break;
          }
        }
        if (done) break;
      }
      if (!finished || !emitted)
        throw new AresError(
          'PROVIDER',
          'Respuesta local vacía o conexión incompleta; no se guardó el turno.',
        );
      combined.throwIfAborted();
    } catch (error) {
      if (signal?.aborted) throw new AresError('CANCELLED', 'Inferencia local cancelada.');
      if (timeout.aborted) throw new AresError('PROVIDER', 'Tiempo de espera local agotado.');
      if (error instanceof AresError) throw error;
      throw new AresError('PROVIDER', 'No se pudo completar la inferencia local.');
    } finally {
      await reader?.cancel().catch(() => {});
      reader?.releaseLock();
    }
  }
}
