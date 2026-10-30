import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conversation } from '../dist/conversation/domain/conversation.js';
import { Ask } from '../dist/conversation/application/ask.js';
import { SqliteStore } from '../dist/infrastructure/sqlite-store.js';
import { temporary, identity } from './helpers.mjs';

test('completed conversation survives closing and reopening SQLite', async t => {
  const home = temporary(t);
  let store = new SqliteStore(home); t.after(() => store.close());
  let messages;
  const model = { name: 'fixture', async *stream(input) { messages = input; yield 'Primera '; yield 'respuesta'; } };
  const result = await new Ask(store.conversations, model, identity).execute({ prompt: 'Primera pregunta' });
  store.close(); store = new SqliteStore(home);
  const next = await new Ask(store.conversations, model, identity).execute({ prompt: 'Segunda pregunta', sessionId: result.id });
  assert.equal(next.turns.length, 2);
  assert.deepEqual(messages.slice(1).map(m => m.role), ['user', 'assistant', 'user']);
  assert.equal(messages[1].content, 'Primera pregunta');
});

test('partial provider output and cancellation are never saved as completed turns', async t => {
  const store = new SqliteStore(temporary(t)); t.after(() => store.close());
  const failed = { name: 'fixture', async *stream() { yield 'partial'; throw new Error('connection lost'); } };
  await assert.rejects(new Ask(store.conversations, failed, identity).execute({ prompt: 'Question' }), /connection lost/);
  assert.deepEqual(store.conversations.list(), []);
  const controller = new AbortController();
  const cancelled = { name: 'fixture', async *stream() { yield 'partial'; controller.abort(); } };
  await assert.rejects(new Ask(store.conversations, cancelled, identity).execute({ prompt: 'Question', signal: controller.signal }));
  assert.deepEqual(store.conversations.list(), []);
});

test('optimistic revision prevents lost updates between two terminals', t => {
  const home = temporary(t), first = new SqliteStore(home), second = new SqliteStore(home);
  t.after(() => first.close()); t.after(() => second.close());
  const turn = { prompt: 'p', answer: 'a', at: 'now', model: 'fixture' };
  first.conversations.save(Conversation.start('session-1', 'now', 'Title').append(turn), 0);
  const a = first.conversations.get('session-1'), b = second.conversations.get('session-1');
  first.conversations.save(a.append(turn), a.data.revision);
  assert.throws(() => second.conversations.save(b.append(turn), b.data.revision), /otra terminal/);
  assert.equal(first.conversations.get('session-1').data.turns.length, 2);
});
