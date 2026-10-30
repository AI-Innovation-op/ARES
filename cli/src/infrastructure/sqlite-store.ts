import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Conversation, type ConversationData } from '../conversation/domain/conversation.js';
import type { ConversationRepository } from '../conversation/application/ask.js';
import { Proposal, type ProposalData } from '../changes/domain/proposal.js';
import type { ProposalRepository } from '../changes/application/change-code.js';
import { AresError, requireText } from '../shared/domain/errors.js';
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
    if (schemaVersion > 3) {
      this.db.close();
      throw new AresError(
        'CONFIG',
        'Esta base de datos requiere una versión más reciente de ARES.',
      );
    }
    if (schemaVersion > 0 && schemaVersion < 3) {
      const backup = path.join(home, `ares-schema-${schemaVersion}-backup-${randomUUID()}.sqlite`);
      try {
        this.db.prepare('VACUUM INTO ?').run(backup);
        fs.chmodSync(backup, 0o600);
      } catch (error) {
        this.db.close();
        throw error;
      }
    }
    try {
      this.db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, created_at TEXT NOT NULL, data TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS verifications (id TEXT PRIMARY KEY, proposal_id TEXT, started_at TEXT NOT NULL, data TEXT NOT NULL) STRICT;
      CREATE INDEX IF NOT EXISTS verifications_by_proposal ON verifications (proposal_id, started_at);
      CREATE VIRTUAL TABLE IF NOT EXISTS conversations_search USING fts5(id UNINDEXED, title, content, tokenize = 'unicode61 remove_diacritics 2');
    `);
      if (schemaVersion < 3) {
        this.db.exec('DELETE FROM conversations_search');
        for (const row of this.db.prepare('SELECT data FROM conversations').iterate()) {
          const data = new Conversation(JSON.parse(String(row.data)) as ConversationData).data;
          this.indexConversation(data);
        }
      }
      this.db.exec('PRAGMA user_version = 3; COMMIT;');
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
        const row = this.record('conversations', id);
        return row ? new Conversation(JSON.parse(String(row.data)) as ConversationData) : undefined;
      },
      save: (conversation, expectedRevision) => {
        const data = conversation.data;
        this.transaction(() => {
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
          this.indexConversation(data);
        });
      },
      list: () =>
        this.db
          .prepare('SELECT data FROM conversations ORDER BY updated_at DESC, id LIMIT 50')
          .all()
          .map((row) => {
            const { turns: _turns, ...summary } = JSON.parse(String(row.data)) as ConversationData;
            return summary;
          }),
      search: (query, limit = 20) => {
        requireText(query, 'Búsqueda', 200);
        if (!Number.isInteger(limit) || limit < 1 || limit > 50)
          throw new AresError('VALIDATION', 'El límite debe estar entre 1 y 50.');
        const terms = query.match(/[\p{L}\p{N}_]+/gu) || [];
        if (!terms.length || terms.length > 20)
          throw new AresError('VALIDATION', 'La búsqueda requiere entre 1 y 20 palabras.');
        const expression = terms.map((term) => '"' + term + '"').join(' AND ');
        return this.db
          .prepare(
            `SELECT conversations.id, conversations_search.title, conversations.updated_at,
          conversations.revision, snippet(conversations_search, 2, '[', ']', '...', 24) AS excerpt
          FROM conversations_search JOIN conversations ON conversations.id = conversations_search.id
          WHERE conversations_search MATCH ? ORDER BY bm25(conversations_search), conversations.updated_at DESC, conversations.id LIMIT ?`,
          )
          .all(expression, limit)
          .map((row) => ({
            id: String(row.id),
            title: String(row.title),
            updatedAt: String(row.updated_at),
            revision: Number(row.revision),
            excerpt: String(row.excerpt),
          }));
      },
    };
    this.proposals = {
      get: (id) => {
        const row = this.record('proposals', id);
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
        const row = this.record('verifications', id);
        return row ? new Verification(JSON.parse(String(row.data)) as VerificationData) : undefined;
      },
      list: (proposalId) => {
        const rows = proposalId
          ? this.db
              .prepare(
                'SELECT data FROM verifications WHERE proposal_id = ? ORDER BY started_at DESC, id LIMIT 50',
              )
              .all(this.proposals.get(proposalId)?.data.id || proposalId)
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

  private transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private indexConversation(data: ConversationData): void {
    this.db.prepare('DELETE FROM conversations_search WHERE id = ?').run(data.id);
    const text = data.turns.map((turn) => turn.prompt + '\n' + turn.answer).join('\n\n');
    this.db
      .prepare('INSERT INTO conversations_search (id, title, content) VALUES (?, ?, ?)')
      .run(data.id, data.title, text);
  }

  private record(table: 'conversations' | 'proposals' | 'verifications', id: string) {
    const exact = this.db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
    if (exact || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) return exact;
    const rows = this.db.prepare(`SELECT data FROM ${table} WHERE id LIKE ? LIMIT 2`).all(id + '%');
    if (rows.length > 1)
      throw new AresError('CONFLICT', 'ID ambiguo; escribe más caracteres del identificador.');
    return rows[0];
  }
}
