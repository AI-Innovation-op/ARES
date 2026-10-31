import { ChangeBundle, type BundlePayload } from '../domain/change-bundle.js';
import {
  ChangeCode,
  type ProposalRepository,
  type ChangeWorkspace,
} from '../../changes/application/change-code.js';
import type { Snapshot } from '../../shared/domain/source-path.js';
import type { Identity } from '../../shared/application/ports.js';
import { AresError } from '../../shared/domain/errors.js';
export const canonicalText = (text: string) => text.replaceAll('\r\n', '\n');
export class ShareProposal {
  constructor(
    private readonly proposals: ProposalRepository,
    private readonly workspace: ChangeWorkspace,
    private readonly identity: Identity,
    private readonly digest: (text: string) => string,
  ) {}
  verify(bundle: ChangeBundle): void {
    if (this.digest(bundle.payload()) !== bundle.data.digest)
      throw new AresError('CONFLICT', 'El contenido no coincide con la huella del paquete.');
  }
  export(id: string): ChangeBundle {
    const proposal = this.proposals.get(id);
    if (!proposal) throw new AresError('NOT_FOUND', 'Propuesta no encontrada.');
    const data = proposal.data;
    if (!['proposed', 'applied'].includes(data.status))
      throw new AresError('CONFLICT', 'Solo se exportan propuestas proposed o applied.');
    return this.workspace.withLock(data.root, () => {
      const changes = data.changes.map((change) => {
        const current = this.workspace.read(data.root, change.path);
        let before: string | null;
        if (data.status === 'proposed') {
          if ((current?.hash ?? null) !== change.beforeHash)
            throw new AresError(
              'CONFLICT',
              'La propuesta ya no coincide con sus archivos de origen.',
            );
          before = current?.content ?? null;
        } else {
          if (
            (current?.content ?? null) !== change.after ||
            !Object.hasOwn(data.backups, change.path)
          )
            throw new AresError(
              'CONFLICT',
              'La propuesta aplicada cambió o no conserva sus copias.',
            );
          before = data.backups[change.path];
          if ((before === null ? null : this.digest(before)) !== change.beforeHash)
            throw new AresError('CONFLICT', 'Las copias no coinciden con la propuesta.');
        }
        return {
          path: change.path,
          beforeHash: before === null ? null : this.digest(canonicalText(before)),
          after: change.after === null ? null : canonicalText(change.after),
        };
      });
      const payload: BundlePayload = {
        format: 'ares-change',
        version: 1,
        createdAt: data.createdAt,
        summary: data.summary,
        changes,
      };
      const candidate = new ChangeBundle({ ...payload, digest: '0'.repeat(64) });
      return new ChangeBundle({ ...candidate.data, digest: this.digest(candidate.payload()) });
    });
  }
  import(bundle: ChangeBundle, snapshot: Snapshot) {
    this.verify(bundle);
    return this.workspace.withLock(snapshot.root, () => {
      const changes = bundle.data.changes.map((change) => {
        const current = this.workspace.read(snapshot.root, change.path);
        if (
          (current === null ? null : this.digest(canonicalText(current.content))) !==
          change.beforeHash
        )
          throw new AresError(
            'CONFLICT',
            `El archivo de destino cambió: ${change.path}. No se importó ni escribió la propuesta.`,
          );
        const crlf = current?.content.includes('\r\n') && !/(?<!\r)\n/.test(current.content);
        return {
          path: change.path,
          content:
            change.after === null
              ? null
              : crlf
                ? change.after.replaceAll('\n', '\r\n')
                : change.after,
        };
      });
      return new ChangeCode(this.proposals, this.workspace, this.identity).create(
        snapshot,
        'Importación de un paquete de equipo',
        { summary: bundle.data.summary, changes },
      );
    });
  }
}
