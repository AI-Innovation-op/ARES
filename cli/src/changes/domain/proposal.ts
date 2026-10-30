import { SourcePath } from '../../workspace/domain/source-path.js';
import { AresError, requireText } from '../../shared/domain/errors.js';

export type ProposalStatus = 'proposed' | 'applying' | 'applied' | 'restoring' | 'restored';
export interface FileChange {
  readonly path: string;
  readonly beforeHash: string | null;
  readonly after: string | null;
}
export interface ProposalData {
  readonly id: string;
  readonly root: string;
  readonly instruction: string;
  readonly summary: string;
  readonly createdAt: string;
  readonly status: ProposalStatus;
  readonly revision: number;
  readonly changes: readonly FileChange[];
  readonly backups: Readonly<Record<string, string | null>>;
}

const TRANSITIONS: Record<ProposalStatus, readonly ProposalStatus[]> = {
  proposed: ['applying'],
  applying: ['applied', 'restoring'],
  applied: ['restoring'],
  restoring: ['restored'],
  restored: [],
};

/** Reviewable change set; a model can propose content but cannot authorize writes. */
export class Proposal {
  readonly data: ProposalData;
  constructor(data: ProposalData) {
    requireText(data.summary, 'Resumen', 4000);
    if (
      !/^[a-zA-Z0-9-]{1,64}$/.test(data.id) ||
      !TRANSITIONS[data.status] ||
      !Number.isInteger(data.revision) ||
      data.revision < 0 ||
      data.changes.length < 1 ||
      data.changes.length > 24
    ) {
      throw new AresError('VALIDATION', 'Propuesta inválida (máximo 24 archivos).');
    }
    const seen = new Set<string>();
    let total = 0;
    for (const change of data.changes) {
      new SourcePath(change.path);
      if (
        seen.has(change.path.toLowerCase()) ||
        (change.beforeHash !== null && !/^[a-f0-9]{64}$/.test(change.beforeHash)) ||
        (change.after !== null && typeof change.after !== 'string') ||
        (change.beforeHash === null && change.after === null)
      ) {
        throw new AresError('VALIDATION', `Cambio inválido o duplicado: ${change.path}`);
      }
      seen.add(change.path.toLowerCase());
      total += change.after?.length || 0;
      if (
        change.after !== null &&
        (change.after.length > 200_000 ||
          change.after.includes('\0') ||
          /[\uD800-\uDFFF]/u.test(change.after))
      ) {
        throw new AresError(
          'VALIDATION',
          `El contenido debe ser texto UTF-8 válido de hasta 200000 caracteres: ${change.path}`,
        );
      }
    }
    if (total > 800_000)
      throw new AresError('VALIDATION', 'La propuesta excede el límite de contenido.');
    for (const name of seen) {
      if ([...seen].some((other) => other.startsWith(name + '/')))
        throw new AresError(
          'VALIDATION',
          'Una propuesta no puede convertir un archivo en directorio.',
        );
    }
    this.data = Object.freeze({
      ...data,
      changes: Object.freeze(data.changes.map((c) => Object.freeze({ ...c }))),
      backups: Object.freeze({ ...data.backups }),
    });
    Object.freeze(this);
  }

  transition(status: ProposalStatus, backups = this.data.backups): Proposal {
    if (!TRANSITIONS[this.data.status].includes(status))
      throw new AresError('CONFLICT', `No se permite ${this.data.status} -> ${status}.`);
    return new Proposal({ ...this.data, status, revision: this.data.revision + 1, backups });
  }
}
