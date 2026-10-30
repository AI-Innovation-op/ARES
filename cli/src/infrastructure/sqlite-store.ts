import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { Conversation, type ConversationData } from '../conversation/domain/conversation.js';
import type { ConversationRepository } from '../conversation/application/ask.js';
import { Proposal, type ProposalData } from '../changes/domain/proposal.js';
import type { ProposalRepository } from '../changes/application/change-code.js';
import { AresError } from '../shared/domain/errors.js';
import { openDatabase } from './native-sqlite.js';
import { Verification, type VerificationData } from '../verification/domain/verification.js';
import type { VerificationRepository } from '../verification/application/verify-project.js';

export class SqliteStore {
  private readonly db: DatabaseSync;
  readonly conversations: ConversationRepository;
  readonly proposals: ProposalRepository;
  readonly verifications: VerificationRepository;
  constructor(home: string) {
    fs.mkdirSync(home, { recursive: true, mode: 0o700 });
    const file = path.join(home, 'ares.sqlite');
    this.db = openDatabase(file, { timeout: 5000 });
    fs.chmodSync(file, 0o600);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;');
    const schemaVersion = Number(this.db.prepare('PRAGMA user_version').get()?.user_version);
    if (schemaVersion > 2) {
      this.db.close();
      throw new AresError(
        'CONFIG',
        'Esta base de datos requiere una versión más reciente de ARES.',
      );
    }
    try {
      this.db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, created_at TEXT NOT NULL, data TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS verifications (id TEXT PRIMARY KEY, proposal_id TEXT, started_at TEXT NOT NULL, data TEXT NOT NULL) STRICT;
      CREATE INDEX IF NOT EXISTS verifications_by_proposal ON verifications (proposal_id, started_at);
      PRAGMA user_version = 2;
      COMMIT;
    `);
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } finally {
        this.db.close();
      }
      throw error;
    }
    this.conversations = {
      get: (id) => {
        const row = this.db.prepare('SELECT data FROM conversations WHERE id = ?').get(id);
        return row ? new Conversation(JSON.parse(String(row.data)) as ConversationData) : undefined;
      },
      save: (conversation, expectedRevision) => {
        const data = conversation.data;
        if (expectedRevision === 0) {
          const result = this.db
            .prepare('INSERT OR IGNORE INTO conversations VALUES (?, ?, ?, ?)')
            .run(data.id, data.revision, data.updatedAt, JSON.stringify(data));
          if (result.changes === 0)
            throw new AresError(
              'CONFLICT',
              'La sesión cambió en otra terminal; reintenta con su estado actual.',
            );
        } else {
          const result = this.db
            .prepare(
              'UPDATE conversations SET revision = ?, updated_at = ?, data = ? WHERE id = ? AND revision = ?',
            )
            .run(data.revision, data.updatedAt, JSON.stringify(data), data.id, expectedRevision);
          if (result.changes === 0)
            throw new AresError(
              'CONFLICT',
              'La sesión cambió en otra terminal; el turno no se guardó.',
            );
        }
      },
      list: () =>
        this.db
          .prepare('SELECT data FROM conversations ORDER BY updated_at DESC, id LIMIT 50')
          .all()
          .map((row) => {
            const { turns: _turns, ...summary } = JSON.parse(String(row.data)) as ConversationData;
            return summary;
          }),
    };
    this.proposals = {
      get: (id) => {
        const row = this.db.prepare('SELECT data FROM proposals WHERE id = ?').get(id);
        return row ? new Proposal(JSON.parse(String(row.data)) as ProposalData) : undefined;
      },
      save: (proposal, expectedRevision) => {
        const data = proposal.data;
        const result =
          expectedRevision === null
            ? this.db
                .prepare('INSERT OR IGNORE INTO proposals VALUES (?, ?, ?, ?)')
                .run(data.id, data.revision, data.createdAt, JSON.stringify(data))
            : this.db
                .prepare(
                  'UPDATE proposals SET revision = ?, data = ? WHERE id = ? AND revision = ?',
                )
                .run(data.revision, JSON.stringify(data), data.id, expectedRevision);
        if (result.changes === 0)
          throw new AresError(
            'CONFLICT',
            'La propuesta cambió en otra terminal; vuelve a consultar su estado.',
          );
      },
      list: () =>
        this.db
          .prepare('SELECT data FROM proposals ORDER BY created_at DESC, id LIMIT 50')
          .all()
          .map((row) => {
            const p = JSON.parse(String(row.data)) as ProposalData;
            return {
              id: p.id,
              summary: p.summary,
              status: p.status,
              root: p.root,
              createdAt: p.createdAt,
            };
          }),
    };
    this.verifications = {
      save: (verification) => {
        const data = verification.data;
        const result = this.db
          .prepare('INSERT OR IGNORE INTO verifications VALUES (?, ?, ?, ?)')
          .run(data.id, data.proposalId, data.startedAt, JSON.stringify(data));
        if (result.changes === 0)
          throw new AresError(
            'CONFLICT',
            'La evidencia de verificación ya existe y no se sobrescribe.',
          );
      },
      get: (id) => {
        const row = this.db.prepare('SELECT data FROM verifications WHERE id = ?').get(id);
        return row ? new Verification(JSON.parse(String(row.data)) as VerificationData) : undefined;
      },
      list: (proposalId) => {
        const rows = proposalId
          ? this.db
              .prepare(
                'SELECT data FROM verifications WHERE proposal_id = ? ORDER BY started_at DESC, id LIMIT 50',
              )
              .all(proposalId)
          : this.db
              .prepare('SELECT data FROM verifications ORDER BY started_at DESC, id LIMIT 50')
              .all();
        return rows.map(
          (row) => new Verification(JSON.parse(String(row.data)) as VerificationData).data,
        );
      },
    };
  }
  close(): void {
    this.db.close();
  }
}
