import type { Configuration } from './configuration.js';
import { readBoundedText } from './http-body.js';
import { AresError } from '../shared/domain/errors.js';

export interface CatalogModel {
  readonly id: string;
  readonly name: string;
  readonly contextLength?: number;
}

export async function listModels(
  config: Configuration,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<readonly CatalogModel[]> {
  if (config.provider === 'gemini' && !config.apiKey)
    throw new AresError('CONFIG', 'Configura GEMINI_API_KEY para consultar el catálogo de Gemini.');
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await request(`${config.baseUrl}/models`, {
      signal: combined,
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new AresError(
        'PROVIDER',
        `Catálogo HTTP ${response.status}; revisa el proveedor y la credencial.`,
      );
    }
    if (!response.body) throw new AresError('PROVIDER', 'Catálogo vacío del proveedor.');
    let payload: unknown;
    try {
      payload = JSON.parse(await readBoundedText(response.body, 8_000_000));
    } catch (error) {
      if (error instanceof AresError) throw error;
      throw new AresError('PROVIDER', 'El catálogo no contiene JSON válido.');
    }
    if (
      !payload ||
      typeof payload !== 'object' ||
      !Array.isArray((payload as { data?: unknown }).data)
    )
      throw new AresError('PROVIDER', 'Formato de catálogo no compatible; se esperaba data[].');
    const entries = (payload as { data: unknown[] }).data;
    if (entries.length > 20_000)
      throw new AresError('PROVIDER', 'El catálogo excede el límite de modelos.');
    const models = new Map<string, CatalogModel>();
    for (const item of entries) {
      if (!item || typeof item !== 'object') continue;
      const model = item as Record<string, unknown>;
      if (
        typeof model.id !== 'string' ||
        !model.id.trim() ||
        model.id.length > 200 ||
        /[\x00-\x1f\x7f]/.test(model.id)
      )
        continue;
      models.set(model.id, {
        id: model.id,
        name: typeof model.name === 'string' ? model.name.slice(0, 240) : model.id,
        ...(typeof model.context_length === 'number' && Number.isFinite(model.context_length)
          ? { contextLength: model.context_length }
          : {}),
      });
    }
    return [...models.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  } catch (error) {
    if (signal?.aborted) throw new AresError('CANCELLED', 'Consulta del catálogo cancelada.');
    if (timeout.aborted)
      throw new AresError('PROVIDER', 'Tiempo de espera agotado consultando modelos.');
    if (error instanceof AresError) throw error;
    throw new AresError('PROVIDER', 'No se pudo consultar el catálogo del proveedor.');
  }
}
