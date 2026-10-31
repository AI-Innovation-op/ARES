import { AresError } from '../../shared/domain/errors.js';

export interface LocalResources {
  readonly totalMemoryBytes: number;
  readonly availableMemoryBytes: number;
  readonly gpuMemoryBytes?: number;
  readonly gpuFreeBytes?: number;
  readonly platform: string;
  readonly architecture: string;
  readonly cpuModel?: string;
}
export interface LocalModelInfo {
  readonly name: string;
  readonly sizeBytes: number;
  readonly maxContext: number;
  readonly digest: string;
  readonly residentVramBytes?: number;
}
export interface LocalBudget {
  readonly contextTokens: number;
  readonly outputTokens: number;
  readonly inputBudgetBytes: number;
  readonly estimation: 'utf8-bytes-conservative';
  readonly recommendation: string;
}

/** A memory heuristic, not a tokenizer or a promise that allocation will succeed. */
export function localBudget(
  resources: LocalResources,
  model: LocalModelInfo,
  requested?: number,
  output = 1024,
): LocalBudget {
  const gib = 1024 ** 3;
  const gpuHeadroom =
    (resources.gpuFreeBytes ?? 0) + (model.residentVramBytes ?? 0) - model.sizeBytes;
  const ramHeadroom = resources.availableMemoryBytes - model.sizeBytes;
  const headroom = Math.max(gpuHeadroom, ramHeadroom);
  const recommended = headroom < 2 * gib ? 2048 : headroom >= 8 * gib ? 8192 : 4096;
  const contextTokens = Math.min(requested ?? recommended, model.maxContext);
  if (!Number.isInteger(contextTokens) || contextTokens < 2048 || contextTokens > 32768)
    throw new AresError(
      'CONFIG',
      'El modelo requiere un contexto entre 2048 y 32768 para este modo.',
    );
  const outputTokens = Math.min(output, Math.floor(contextTokens / 4));
  return Object.freeze({
    contextTokens,
    outputTokens,
    inputBudgetBytes: contextTokens - outputTokens - 256,
    estimation: 'utf8-bytes-conservative',
    recommendation: requested
      ? 'Límite elegido por el usuario; valida su consumo con local status.'
      : `Contexto conservador según memoria disponible: ${recommended}; confirma el rendimiento con una inferencia real.`,
  });
}
