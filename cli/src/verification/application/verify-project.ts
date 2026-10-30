import { Verification, type VerificationData } from '../domain/verification.js';
import type { Identity } from '../../shared/application/ports.js';
import type { ProposalRepository, ChangeWorkspace } from '../../changes/application/change-code.js';
import { AresError } from '../../shared/domain/errors.js';

export interface CheckPlan {
  readonly root: string;
  readonly script: string;
  readonly command: string;
  readonly fingerprint: string;
  readonly sourceFiles: number;
  readonly limited: boolean;
}
export interface CheckResult {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly durationMs: number;
  readonly termination: 'exited' | 'cancelled' | 'timed-out';
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated: boolean;
}
export interface ProjectChecks {
  plan(root: string, script: string): CheckPlan;
  run(plan: CheckPlan, timeoutMs: number, signal?: AbortSignal): Promise<CheckResult>;
}
export interface VerificationRepository {
  save(verification: Verification): void;
  get(id: string): Verification | undefined;
  list(proposalId?: string): readonly VerificationData[];
}

export class VerifyProject {
  constructor(
    private readonly checks: ProjectChecks,
    private readonly records: VerificationRepository,
    private readonly proposals: ProposalRepository,
    private readonly workspace: ChangeWorkspace,
    private readonly identity: Identity,
  ) {}

  assess(record: VerificationData): {
    matchesCurrentState: boolean;
    currentStatus: VerificationData['status'];
  } {
    let matchesCurrentState = false;
    try {
      const current = this.checks.plan(record.root, record.script);
      const proposal = record.proposalId ? this.proposals.get(record.proposalId) : undefined;
      matchesCurrentState =
        current.fingerprint === record.inputFingerprint &&
        (!record.proposalId || proposal?.data.revision === record.proposalRevision);
    } catch {
      /* Missing projects or changed manifests invalidate the comparison. */
    }
    return {
      matchesCurrentState,
      currentStatus: record.status === 'passed' && !matchesCurrentState ? 'stale' : record.status,
    };
  }

  async execute(input: {
    root: string;
    script: string;
    proposalId?: string;
    timeoutMs: number;
    signal?: AbortSignal;
  }): Promise<VerificationData> {
    if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 100 || input.timeoutMs > 600_000)
      throw new AresError('VALIDATION', 'El timeout debe estar entre 100 y 600000 ms.');
    const proposal = input.proposalId ? this.proposals.get(input.proposalId) : undefined;
    if (input.proposalId && !proposal)
      throw new AresError('NOT_FOUND', `Propuesta no encontrada: ${input.proposalId}`);
    if (proposal && proposal.data.status !== 'applied')
      throw new AresError('CONFLICT', 'Solo se pueden verificar propuestas aplicadas.');
    const proposalMatches = () =>
      !proposal ||
      proposal.data.changes.every(
        (change) =>
          (this.workspace.read(proposal.data.root, change.path)?.content ?? null) === change.after,
      );
    if (!proposalMatches())
      throw new AresError('CONFLICT', 'Los archivos ya no coinciden con la propuesta aplicada.');
    const plan = this.checks.plan(proposal?.data.root || input.root, input.script);
    if (input.signal?.aborted)
      throw new AresError('CANCELLED', 'Verificación cancelada antes de ejecutarse.');
    const startedAt = this.identity.now();
    const result = await this.checks.run(plan, input.timeoutMs, input.signal);
    let stateChanged = false;
    try {
      const current = this.checks.plan(plan.root, plan.script);
      stateChanged = current.fingerprint !== plan.fingerprint || !proposalMatches();
      if (proposal)
        stateChanged ||=
          this.proposals.get(proposal.data.id)?.data.revision !== proposal.data.revision;
    } catch {
      stateChanged = true;
    }
    const status =
      result.termination === 'cancelled'
        ? 'cancelled'
        : result.termination === 'timed-out'
          ? 'timed-out'
          : stateChanged
            ? 'stale'
            : result.exitCode === 0 && result.signal === null
              ? 'passed'
              : 'failed';
    const verification = new Verification({
      id: this.identity.next(),
      proposalId: proposal?.data.id ?? null,
      proposalRevision: proposal?.data.revision ?? null,
      root: plan.root,
      script: plan.script,
      command: plan.command,
      runner: 'node --run',
      inputFingerprint: plan.fingerprint,
      sourceFiles: plan.sourceFiles,
      contextLimited: plan.limited,
      startedAt,
      durationMs: result.durationMs,
      status,
      exitCode: result.exitCode,
      signal: result.signal,
      stateChanged,
      stdout: result.stdout,
      stderr: result.stderr,
      outputTruncated: result.outputTruncated,
    });
    this.records.save(verification);
    return verification.data;
  }
}
