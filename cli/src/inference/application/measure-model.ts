import type { LanguageModel, Message, ModelUsage } from '../../shared/application/ports.js';

export interface InferenceMeasurement {
  readonly at: string;
  readonly model: string;
  readonly status: 'completed' | 'failed' | 'cancelled';
  readonly durationMs: number;
  readonly firstDeltaMs?: number;
  readonly usage: ModelUsage;
}
export interface MeasurementStore {
  save(measurement: InferenceMeasurement): void;
  list(limit: number): readonly InferenceMeasurement[];
}

export class MeasuredModel implements LanguageModel {
  get name() {
    return this.inner.name;
  }
  get inputBudgetBytes() {
    return this.inner.inputBudgetBytes;
  }
  get usage() {
    return this.inner.usage;
  }
  constructor(
    private readonly inner: LanguageModel,
    private readonly record: (measurement: InferenceMeasurement) => void,
  ) {}
  async *stream(messages: readonly Message[], signal?: AbortSignal): AsyncIterable<string> {
    const start = performance.now();
    let firstDeltaMs: number | undefined,
      completed = false;
    try {
      for await (const chunk of this.inner.stream(messages, signal)) {
        if (chunk && firstDeltaMs === undefined) firstDeltaMs = performance.now() - start;
        yield chunk;
      }
      completed = true;
    } finally {
      this.record({
        at: new Date().toISOString(),
        model: this.name,
        status: signal?.aborted ? 'cancelled' : completed ? 'completed' : 'failed',
        durationMs: performance.now() - start,
        ...(firstDeltaMs === undefined ? {} : { firstDeltaMs }),
        usage: { ...this.inner.usage },
      });
    }
  }
}
