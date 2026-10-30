import { Proposal, type ProposalData } from '../domain/proposal.js';
import type { Snapshot } from '../../workspace/domain/source-path.js';
import { AresError, requireText } from '../../shared/domain/errors.js';
import {
  complete,
  ENGINEERING_POLICY,
  type Identity,
  type LanguageModel,
} from '../../shared/application/ports.js';

export interface ProposalRepository {
  get(id: string): Proposal | undefined;
  save(proposal: Proposal, expectedRevision: number | null): void;
  list(): readonly {
    id: string;
    summary: string;
    status: string;
    root: string;
    createdAt: string;
  }[];
}

export interface ChangeWorkspace {
  read(root: string, path: string): { content: string; hash: string } | null;
  replace(root: string, path: string, content: string | null): void;
  withLock<T>(root: string, action: () => T): T;
}

export class ChangeCode {
  constructor(
    private readonly proposals: ProposalRepository,
    private readonly workspace: ChangeWorkspace,
    private readonly identity: Identity,
  ) {}

  create(snapshot: Snapshot, instruction: string, payload: unknown): ProposalData {
    requireText(instruction, 'Instrucción');
    if (!payload || typeof payload !== 'object')
      throw new AresError('VALIDATION', 'Se requiere un objeto con summary y changes.');
    const parsed = payload as { summary?: unknown; changes?: unknown };
    if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.changes))
      throw new AresError(
        'VALIDATION',
        'Formato esperado: { summary: string, changes: [{ path, content: string | null }] }.',
      );
    const changes = parsed.changes.map((item: unknown) => {
      if (!item || typeof item !== 'object') throw new AresError('VALIDATION', 'Cambio inválido.');
      const change = item as { path?: unknown; content?: unknown };
      if (
        typeof change.path !== 'string' ||
        !(change.content === null || typeof change.content === 'string')
      )
        throw new AresError(
          'VALIDATION',
          'Cada cambio requiere path y content (texto completo o null para eliminar).',
        );
      const before = this.workspace.read(snapshot.root, change.path);
      const scanned = snapshot.files.find((f) => f.path === change.path);
      if (before && !scanned)
        throw new AresError('CONFLICT', `Archivo fuera del contexto inspeccionado: ${change.path}`);
      if ((before?.hash ?? null) !== (scanned?.hash ?? null))
        throw new AresError('CONFLICT', `El archivo cambió durante la propuesta: ${change.path}`);
      if ((before?.content ?? null) === change.content)
        throw new AresError('VALIDATION', `El cambio no modifica contenido: ${change.path}`);
      return { path: change.path, beforeHash: before?.hash ?? null, after: change.content };
    });
    const proposal = new Proposal({
      id: this.identity.next(),
      root: snapshot.root,
      instruction,
      summary: parsed.summary,
      createdAt: this.identity.now(),
      status: 'proposed',
      revision: 0,
      changes,
      backups: {},
    });
    this.proposals.save(proposal, null);
    return proposal.data;
  }

  async generate(
    model: LanguageModel,
    snapshot: Snapshot,
    instruction: string,
    context: string,
    signal?: AbortSignal,
  ): Promise<ProposalData> {
    requireText(instruction, 'Instrucción');
    const answer = await complete(
      model,
      [
        {
          role: 'system',
          content:
            ENGINEERING_POLICY +
            '\nDevuelve exclusivamente JSON: {"summary":"...","changes":[{"path":"src/file.ts","content":"contenido completo"}]}. content null elimina un archivo. Máximo 24 archivos. No incluyas markdown ni comandos. No modifiques archivos ajenos a la instrucción.',
        },
        { role: 'user', content: `${instruction}\n\n${context}` },
      ],
      signal,
    );
    const json = answer
      .trim()
      .replace(/^```(?:json)?\s*\n/i, '')
      .replace(/\n```$/, '');
    let payload: unknown;
    try {
      payload = JSON.parse(json);
    } catch {
      throw new AresError(
        'PROVIDER',
        'El proveedor no devolvió JSON válido; no se creó ni aplicó ninguna propuesta.',
      );
    }
    return this.create(snapshot, instruction, payload);
  }

  get(id: string): Proposal {
    const proposal = this.proposals.get(id);
    if (!proposal) throw new AresError('NOT_FOUND', `Propuesta no encontrada: ${id}`);
    return proposal;
  }

  apply(id: string): ProposalData {
    return this.workspace.withLock(this.get(id).data.root, () => {
      let proposal = this.get(id);
      if (proposal.data.status !== 'proposed')
        throw new AresError(
          'CONFLICT',
          `La propuesta está ${proposal.data.status}; no se puede aplicar de nuevo.`,
        );
      const backups: Record<string, string | null> = {};
      for (const change of proposal.data.changes) {
        const current = this.workspace.read(proposal.data.root, change.path);
        if ((current?.hash ?? null) !== change.beforeHash)
          throw new AresError(
            'CONFLICT',
            `Conflicto en ${change.path}; crea una propuesta nueva con el contenido actual.`,
          );
        backups[change.path] = current?.content ?? null;
      }
      // Durable recovery journal is saved BEFORE the first filesystem mutation.
      proposal = this.saveTransition(proposal, 'applying', backups);
      try {
        for (const change of proposal.data.changes)
          this.workspace.replace(proposal.data.root, change.path, change.after);
        return this.saveTransition(proposal, 'applied').data;
      } catch {
        try {
          this.restoreUnlocked(proposal);
        } catch {
          throw new AresError(
            'IO',
            `Aplicación incompleta. Las copias siguen disponibles: ares restore ${id}. Revisa primero ares diff ${id}.`,
          );
        }
        throw new AresError(
          'IO',
          'No se pudo aplicar la propuesta; se restauró el contenido original.',
        );
      }
    });
  }

  restore(id: string): ProposalData {
    return this.workspace.withLock(this.get(id).data.root, () =>
      this.restoreUnlocked(this.get(id)),
    );
  }

  private restoreUnlocked(proposal: Proposal): ProposalData {
    if (!['applied', 'applying', 'restoring'].includes(proposal.data.status))
      throw new AresError(
        'CONFLICT',
        `No se puede restaurar una propuesta ${proposal.data.status}.`,
      );
    const pending: { path: string; before: string | null }[] = [];
    for (const change of proposal.data.changes) {
      if (!Object.prototype.hasOwnProperty.call(proposal.data.backups, change.path))
        throw new AresError('IO', `Falta copia de ${change.path}.`);
      const before = proposal.data.backups[change.path];
      const current = this.workspace.read(proposal.data.root, change.path)?.content ?? null;
      if (current === before) continue; // A previous recovery may already have restored this file.
      if (current !== change.after)
        throw new AresError(
          'CONFLICT',
          `Restauración detenida: ${change.path} tiene cambios posteriores. Conserva esos cambios antes de continuar.`,
        );
      pending.push({ path: change.path, before });
    }
    if (proposal.data.status !== 'restoring') proposal = this.saveTransition(proposal, 'restoring');
    for (const change of pending)
      this.workspace.replace(proposal.data.root, change.path, change.before);
    return this.saveTransition(proposal, 'restored').data;
  }

  private saveTransition(
    proposal: Proposal,
    status: ProposalData['status'],
    backups = proposal.data.backups,
  ): Proposal {
    const next = proposal.transition(status, backups);
    this.proposals.save(next, proposal.data.revision);
    return next;
  }
}
