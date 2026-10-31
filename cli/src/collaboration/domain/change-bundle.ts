import { SourcePath } from '../../shared/domain/source-path.js';
import { AresError, requireText } from '../../shared/domain/errors.js';
export interface BundleChange {
  readonly path: string;
  readonly beforeHash: string | null;
  readonly after: string | null;
}
export interface BundlePayload {
  readonly format: 'ares-change';
  readonly version: 1;
  readonly createdAt: string;
  readonly summary: string;
  readonly changes: readonly BundleChange[];
}
export interface BundleData extends BundlePayload {
  readonly digest: string;
}
export class ChangeBundle {
  readonly data: BundleData;
  constructor(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new AresError('VALIDATION', 'Paquete de cambios inválido.');
    const value = input as Record<string, unknown>;
    if (
      Object.keys(value).some(
        (key) => !['format', 'version', 'createdAt', 'summary', 'changes', 'digest'].includes(key),
      ) ||
      value.format !== 'ares-change' ||
      value.version !== 1 ||
      typeof value.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      typeof value.summary !== 'string' ||
      typeof value.digest !== 'string' ||
      !/^[a-f0-9]{64}$/.test(value.digest) ||
      !Array.isArray(value.changes) ||
      !value.changes.length ||
      value.changes.length > 24
    )
      throw new AresError('VALIDATION', 'Formato de intercambio no compatible o inválido.');
    requireText(value.summary, 'Resumen', 4000);
    const seen = new Set<string>();
    let total = 0;
    const changes = value.changes
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
          throw new AresError('VALIDATION', 'Cambio de intercambio inválido.');
        const change = item as Record<string, unknown>;
        if (
          Object.keys(change).some((key) => !['path', 'beforeHash', 'after'].includes(key)) ||
          typeof change.path !== 'string' ||
          !(
            change.beforeHash === null ||
            (typeof change.beforeHash === 'string' && /^[a-f0-9]{64}$/.test(change.beforeHash))
          ) ||
          !(change.after === null || typeof change.after === 'string') ||
          (change.beforeHash === null && change.after === null)
        )
          throw new AresError('VALIDATION', 'Cambio de intercambio inválido.');
        new SourcePath(change.path);
        const name = change.path.toLowerCase();
        if (
          seen.has(name) ||
          [...seen].some((other) => other.startsWith(name + '/') || name.startsWith(other + '/'))
        )
          throw new AresError('VALIDATION', 'Rutas duplicadas o incompatibles en el paquete.');
        seen.add(name);
        if (typeof change.after === 'string') {
          total += change.after.length;
          if (
            change.after.length > 200_000 ||
            change.after.includes('\0') ||
            /[\uD800-\uDFFF]/u.test(change.after) ||
            change.after.includes('\r\n')
          )
            throw new AresError(
              'VALIDATION',
              'El paquete requiere texto UTF-8 con saltos LF y contenido acotado.',
            );
        }
        return Object.freeze({
          path: change.path,
          beforeHash: change.beforeHash,
          after: change.after,
        }) as BundleChange;
      })
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    if (total > 800_000) throw new AresError('VALIDATION', 'El paquete excede 800000 caracteres.');
    this.data = Object.freeze({
      format: 'ares-change',
      version: 1,
      createdAt: value.createdAt,
      summary: value.summary,
      changes: Object.freeze(changes),
      digest: value.digest,
    });
    Object.freeze(this);
  }
  payload(): string {
    const { digest: _digest, ...payload } = this.data;
    return JSON.stringify(payload);
  }
}
