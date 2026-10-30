import { AresError, requireText } from '../../shared/domain/errors.js';

export type VerificationStatus = 'passed' | 'failed' | 'cancelled' | 'timed-out' | 'stale';
export interface VerificationData {
  readonly id: string;
  readonly proposalId: string | null;
  readonly proposalRevision: number | null;
  readonly root: string;
  readonly script: string;
  readonly command: string;
  readonly runner: 'node --run';
  readonly inputFingerprint: string;
  readonly sourceFiles: number;
  readonly contextLimited: boolean;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly status: VerificationStatus;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly stateChanged: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated: boolean;
}

/** Evidence is immutable and tied to the inspected source and proposal revision. */
export class Verification {
  readonly data: VerificationData;
  constructor(data: VerificationData) {
    requireText(data.root, 'Proyecto', 4000);
    requireText(data.command, 'Script', 16_000);
    if (
      !/^[a-zA-Z0-9-]{1,64}$/.test(data.id) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(data.script) ||
      !/^[a-f0-9]{64}$/.test(data.inputFingerprint)
    )
      throw new AresError('VALIDATION', 'Verificación inválida.');
    if (
      !Number.isFinite(data.durationMs) ||
      data.durationMs < 0 ||
      !['passed', 'failed', 'cancelled', 'timed-out', 'stale'].includes(data.status)
    )
      throw new AresError('VALIDATION', 'Resultado de verificación inválido.');
    if (
      data.status === 'passed' &&
      (data.exitCode !== 0 || data.stateChanged || data.signal !== null)
    )
      throw new AresError(
        'VALIDATION',
        'Una verificación solo aprueba con salida cero y fuentes sin cambios.',
      );
    this.data = Object.freeze({ ...data });
    Object.freeze(this);
  }
}
