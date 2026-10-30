import type { LanguageModel, Message } from '../shared/application/ports.js';

/** Redact the configured credential before requests, persistence and streamed output. */
export class SecretSafeModel implements LanguageModel {
  readonly name: string;
  constructor(
    private readonly inner: LanguageModel,
    private readonly secret: string,
  ) {
    this.name = inner.name;
  }
  async *stream(messages: readonly Message[], signal?: AbortSignal): AsyncIterable<string> {
    if (!this.secret) {
      yield* this.inner.stream(messages, signal);
      return;
    }
    const sanitized = messages.map((message) => ({
      ...message,
      content: message.content.split(this.secret).join('[REDACTED]'),
    }));
    let pending = '';
    for await (const chunk of this.inner.stream(sanitized, signal)) {
      pending += chunk;
      let index: number;
      while ((index = pending.indexOf(this.secret)) >= 0) {
        yield pending.slice(0, index) + '[REDACTED]';
        pending = pending.slice(index + this.secret.length);
      }
      let keep = Math.min(pending.length, this.secret.length - 1);
      while (keep > 0 && !this.secret.startsWith(pending.slice(-keep))) keep--;
      const ready = pending.slice(0, pending.length - keep);
      if (ready) yield ready;
      pending = pending.slice(pending.length - keep);
    }
    if (pending) yield pending;
  }
}
