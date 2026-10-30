import { AresError } from '../shared/domain/errors.js';

export async function readBoundedText(
  body: ReadableStream<Uint8Array>,
  limit: number,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0,
    result = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        result += decoder.decode();
        return result;
      }
      size += value.byteLength;
      if (size > limit)
        throw new AresError('PROVIDER', 'La respuesta del proveedor excede el límite de tamaño.');
      result += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
