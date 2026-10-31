import type { Configuration } from './configuration.js';
import { readBoundedText } from './http-body.js';
import { AresError } from '../shared/domain/errors.js';
import { PROVIDERS } from './providers.js';

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
  if (!['openrouter', 'compatible'].includes(config.provider) && !config.apiKey)
    throw new AresError(
      'CONFIG',
      `Configura ${PROVIDERS[config.provider].key} para consultar el catálogo.`,
    );
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const cohere = config.provider === 'cohere';
    const base = cohere
      ? 'https://api.cohere.ai/v1/models?endpoint=chat&page_size=1000'
      : `${config.baseUrl}/models`;
    const models = new Map<string, CatalogModel>();
    const seenTokens = new Set<string>();
    let pageToken = '';
    let count = 0;
    do {
      const url = new URL(base);
      if (pageToken) url.searchParams.set('page_token', pageToken);
      const response = await request(url.toString(), {
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
        !Array.isArray((payload as Record<string, unknown>)[cohere ? 'models' : 'data'])
      )
        throw new AresError('PROVIDER', 'Formato de catálogo no compatible; se esperaba data[].');
      const entries = (payload as Record<string, unknown[]>)[cohere ? 'models' : 'data'];
      count += entries.length;
      if (count > 20_000)
        throw new AresError('PROVIDER', 'El catálogo excede el límite de modelos.');
      for (const item of entries) {
        if (!item || typeof item !== 'object') continue;
        const model = item as Record<string, unknown>;
        if (
          model.is_deprecated === true ||
          model.active === false ||
          (model.capabilities as { completion_chat?: boolean } | undefined)?.completion_chat ===
            false
        )
          continue;
        const rawId = cohere ? model.name : model.id;
        const id =
          config.provider === 'gemini' && typeof rawId === 'string'
            ? rawId.replace(/^models\//, '')
            : rawId;
        if (typeof id !== 'string' || !id.trim() || id.length > 200 || /[\x00-\x1f\x7f]/.test(id))
          continue;
        const contextLength = model.context_length ?? model.context_window;
        models.set(id, {
          id,
          name: typeof model.name === 'string' ? model.name.slice(0, 240) : id,
          ...(typeof contextLength === 'number' && Number.isFinite(contextLength)
            ? { contextLength }
            : {}),
        });
      }
      const next = cohere ? (payload as { next_page_token?: unknown }).next_page_token : undefined;
      if (next !== undefined && next !== null && (typeof next !== 'string' || next.length > 2048))
        throw new AresError('PROVIDER', 'Paginación inválida del catálogo.');
      pageToken = typeof next === 'string' ? next : '';
      if (pageToken && (seenTokens.has(pageToken) || seenTokens.size >= 20))
        throw new AresError('PROVIDER', 'La paginación del catálogo excede los límites.');
      if (pageToken) seenTokens.add(pageToken);
    } while (pageToken);
    return [...models.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  } catch (error) {
    if (signal?.aborted) throw new AresError('CANCELLED', 'Consulta del catálogo cancelada.');
    if (timeout.aborted)
      throw new AresError('PROVIDER', 'Tiempo de espera agotado consultando modelos.');
    if (error instanceof AresError) throw error;
    throw new AresError('PROVIDER', 'No se pudo consultar el catálogo del proveedor.');
  }
}
