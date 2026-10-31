import type { Postura, NumeroPose } from '../types/ares.types.js';

export function streamMetadata(data: Record<string, unknown>) {
  if (
    typeof data.conversationId !== 'string' ||
    !data.conversationId ||
    typeof data.stance !== 'string' ||
    !['IDLE', 'SLASH', 'SHIELD', 'SPRINT', 'ERROR', 'VICTORY'].includes(data.stance) ||
    !Number.isInteger(data.poseNumber) ||
    Number(data.poseNumber) < 1 ||
    Number(data.poseNumber) > 16
  ) {
    throw new Error('El servidor devolvió metadatos de conversación no válidos.');
  }
  return {
    conversationId: data.conversationId,
    stance: data.stance as Postura,
    poseNumber: data.poseNumber as NumeroPose,
    model: typeof data.model === 'string' ? data.model : undefined,
    provider: typeof data.provider === 'string' ? data.provider : undefined,
  };
}

/** Read SSE without treating a closed connection as a completed answer. */
export async function consumeChatStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (data: Record<string, unknown>) => void,
): Promise<void> {
  const reader = body.getReader(),
    decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '',
    data: string[] = [],
    completed = false,
    eventSize = 0,
    totalSize = 0;
  const flush = () => {
    if (!data.length) return;
    const event = JSON.parse(data.join('\n'));
    data = [];
    eventSize = 0;
    if (!event || typeof event !== 'object' || Array.isArray(event))
      throw new Error('El servidor devolvió un evento inválido.');
    if (event.type === 'error')
      throw new Error(
        typeof event.message === 'string' ? event.message : 'La generación no pudo completarse.',
      );
    onEvent(event);
    if (event.type === 'done') completed = true;
  };
  try {
    while (!completed) {
      const { value, done } = await reader.read();
      const decoded = decoder.decode(value, { stream: !done });
      totalSize += decoded.length;
      buffer += decoded;
      if (totalSize > 2_000_000) throw new Error('La respuesta excede el límite.');
      if (buffer.length > 1_000_000) throw new Error('El evento del servidor excede el límite.');
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (!line) flush();
        else if (line.startsWith('data:')) {
          eventSize += line.length;
          if (eventSize > 1_000_000) throw new Error('El evento excede el límite.');
          data.push(line.slice(5).replace(/^ /, ''));
        }
        if (completed) break;
      }
      if (done) {
        if (buffer.startsWith('data:')) data.push(buffer.slice(5).trim());
        flush();
        break;
      }
    }
    if (!completed)
      throw new Error(
        'La conexión se cerró antes de completar la respuesta. Puedes volver a intentarlo.',
      );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
