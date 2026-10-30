import fs from 'node:fs';
import path from 'node:path';
import { AresError } from '../shared/domain/errors.js';
import { redact, terminalText } from '../infrastructure/text.js';

export function print(value: unknown, json: boolean, text?: string): void {
  process.stdout.write(
    json
      ? JSON.stringify(value) + '\n'
      : terminalText(text ?? (typeof value === 'string' ? value : JSON.stringify(value, null, 2))) +
          '\n',
  );
}

export function diagnostic(text: string): void {
  process.stderr.write(terminalText(redact(text)) + '\n');
}

export function saveOutput(file: string, content: string | Buffer): string {
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  try {
    fs.writeFileSync(absolute, content, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new AresError(
        'CONFLICT',
        `El archivo de salida ya existe: ${absolute}. Elige otro nombre.`,
      );
    throw error;
  }
  return absolute;
}

export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY)
    throw new AresError(
      'VALIDATION',
      'Escribe una consulta o envíala por stdin. Ejemplo: ares ask "Explica un agregado DDD"',
    );
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 500_000) throw new AresError('VALIDATION', 'La entrada por stdin supera 500 KB.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8').trim();
}

export async function cancellable<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.on('SIGINT', interrupt);
  try {
    return await work(controller.signal);
  } finally {
    process.off('SIGINT', interrupt);
  }
}
