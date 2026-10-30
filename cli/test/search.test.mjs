import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { Conversation } from '../dist/conversation/domain/conversation.js';
import { SqliteStore } from '../dist/infrastructure/sqlite-store.js';
import { openDatabase } from '../dist/infrastructure/native-sqlite.js';
import { temporary, run } from './helpers.mjs';

const turn = (prompt, answer = 'answer') => ({
  prompt,
  answer,
  at: '2026-10-30T12:00:00Z',
  model: 'fixture',
});
function storeFor(t) {
  const home = temporary(t),
    store = new SqliteStore(home);
  t.after(() => store.close());
  return { home, store };
}

test('history search finds title, prompt and answer words, including accent-insensitive Spanish', (t) => {
  const { home, store } = storeFor(t);
  store.conversations.save(
    Conversation.start('aaaaaaaa-0000-4000-8000-000000000001', 'now', 'Diseño DDD').append(
      turn('Límites del agregado', 'Persistencia transaccional'),
    ),
    0,
  );
  store.conversations.save(
    Conversation.start('bbbbbbbb-0000-4000-8000-000000000002', 'later', 'Otra sesión').append(
      turn('Sin coincidencia'),
    ),
    0,
  );
  assert.equal(store.conversations.search('diseno').length, 1);
  assert.equal(store.conversations.search('limites agregado').length, 1);
  const result = run(['sessions', 'search', 'persistencia', '--json'], home);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout)[0].title, 'Diseño DDD');
  assert.equal(store.conversations.get('aaaaaaaa').data.title, 'Diseño DDD');
  assert.equal(run(['sessions', 'show', 'aaaaaaaa', '--json'], home).status, 0);
});

test('short identifiers resolve only when unique and never accept wildcard prefixes', (t) => {
  const { store } = storeFor(t);
  for (const suffix of ['1', '2'])
    store.conversations.save(
      Conversation.start('aaaaaaaa-0000-4000-8000-00000000000' + suffix, 'now', 'Title').append(
        turn('prompt'),
      ),
      0,
    );
  assert.throws(() => store.conversations.get('aaaaaaaa'), /ambiguo/);
  assert.equal(store.conversations.get('aaaaaaaa%'), undefined);
  assert.equal(store.conversations.get("' OR 1=1 --"), undefined);
  assert.equal(store.conversations.get('aaaaaaaa-0000-4000-8000-000000000001').data.revision, 1);
});

test('stale session writes cannot insert searchable text or erase the winning index', (t) => {
  const { store } = storeFor(t);
  const original = Conversation.start('session-unique', 'now', 'Original').append(turn('initial'));
  store.conversations.save(original, 0);
  store.conversations.save(original.append(turn('winner')), 1);
  assert.throws(() => store.conversations.save(original.append(turn('loser')), 1), /otra terminal/);
  assert.equal(store.conversations.search('winner').length, 1);
  assert.deepEqual(store.conversations.search('loser'), []);
});

test('search input is literal words and cannot invoke FTS or SQL operators', (t) => {
  const { store } = storeFor(t);
  store.conversations.save(
    Conversation.start('search-session', 'now', 'Alpha').append(turn('alpha OR beta')),
    0,
  );
  store.conversations.save(
    Conversation.start('other-session', 'now', 'Beta').append(turn('alpha only')),
    0,
  );
  assert.equal(store.conversations.search('alpha OR beta').length, 1);
  assert.deepEqual(store.conversations.search("'; DROP TABLE conversations; --"), []);
  for (const value of ['', '***', 'word '.repeat(21)])
    assert.throws(() => store.conversations.search(value));
  assert.throws(() => store.conversations.search('alpha', 100));
  assert.equal(store.conversations.list().length, 2);
});

test('schema 2 migration backfills existing history into the search index without rewriting it', (t) => {
  const home = temporary(t),
    file = path.join(home, 'ares.sqlite');
  const db = openDatabase(file);
  db.exec(
    'CREATE TABLE conversations (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL) STRICT; PRAGMA user_version = 2;',
  );
  const original = Conversation.start('existing-session', 'then', 'Arquitectura').append(
    turn('Migración segura', 'Todo conservado'),
  ).data;
  db.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run(
    original.id,
    original.revision,
    original.updatedAt,
    JSON.stringify(original),
  );
  db.close();
  const store = new SqliteStore(home);
  try {
    assert.deepEqual(store.conversations.get(original.id).data, original);
    assert.equal(store.conversations.search('migracion').length, 1);
  } finally {
    store.close();
  }
  const backups = fs.readdirSync(home).filter((name) => name.startsWith('ares-schema-2-backup-'));
  assert.equal(backups.length, 1);
  const backup = openDatabase(path.join(home, backups[0]));
  try {
    assert.equal(backup.prepare('PRAGMA user_version').get().user_version, 2);
    assert.deepEqual(
      JSON.parse(backup.prepare('SELECT data FROM conversations').get().data),
      original,
    );
  } finally {
    backup.close();
  }
  const reopened = new SqliteStore(home);
  reopened.close();
  assert.equal(
    fs.readdirSync(home).filter((name) => name.startsWith('ares-schema-2-backup-')).length,
    1,
  );
});
