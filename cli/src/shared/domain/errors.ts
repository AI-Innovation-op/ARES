export type ErrorCode = 'VALIDATION' | 'CONFIG' | 'NOT_FOUND' | 'CONFLICT' | 'PROVIDER' | 'CANCELLED' | 'IO';

export class AresError extends Error {
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'AresError';
  }
}

export function requireText(value: string, label: string, max = 120_000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new AresError('VALIDATION', `${label}: se requiere texto de 1 a ${max} caracteres.`);
  }
  return value;
}
