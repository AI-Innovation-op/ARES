import type { LanguageModel, Message } from '../shared/application/ports.js';
import { redactCredentials } from './providers.js';

/** Redact the configured credential before requests, persistence and streamed output. */
export class SecretSafeModel implements LanguageModel {
  readonly name: string;
  private readonly secrets: readonly string[];
  get inputBudgetBytes() {
    return this.inner.inputBudgetBytes;
  }
  get usage() {
    return this.inner.usage;
  }
  constructor(
    private readonly inner: LanguageModel,
    secrets: string | readonly string[],
  ) {
    this.name = inner.name;
    this.secrets = [...new Set(typeof secrets === 'string' ? [secrets] : secrets)]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }
  async *stream(messages: readonly Message[], signal?: AbortSignal): AsyncIterable<string> {
    const sanitized = messages.map((message) => ({
      ...message,
      content: redactCredentials(message.content, this.secrets),
    }));
    let output = this.inner.stream(sanitized, signal);
    for (const secret of this.secrets) output = redactStream(output, secret);
    yield* output;
  }
}

async function* redactStream(source: AsyncIterable<string>, secret: string): AsyncIterable<string> {
  let pending = '';
  for await (const chunk of source) {
    pending += chunk;
    let index: number;
    while ((index = pending.indexOf(secret)) >= 0) {
      yield pending.slice(0, index) + '[REDACTED]';
      pending = pending.slice(index + secret.length);
    }
    let keep = Math.min(pending.length, secret.length - 1);
    while (keep > 0 && !secret.startsWith(pending.slice(-keep))) keep--;
    const ready = pending.slice(0, pending.length - keep);
    if (ready) yield ready;
    pending = pending.slice(pending.length - keep);
  }
  if (pending) yield pending;
}
