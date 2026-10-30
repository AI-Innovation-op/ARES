import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { Conversation } from '../dist/conversation/domain/conversation.js';
import { Proposal } from '../dist/changes/domain/proposal.js';
import { SourcePath } from '../dist/workspace/domain/source-path.js';
import { cliRoot } from './helpers.mjs';

test('conversation appends only complete turns and preserves the previous aggregate', () => {
  const original = Conversation.start('session-1', '2026-10-30', 'Mi proyecto');
  const turn = { prompt: 'Pregunta', answer: 'Respuesta', at: '2026-10-30', model: 'fixture' };
  const completed = original.append(turn);
  assert.equal(original.data.revision, 0); assert.equal(completed.data.revision, 1);
  turn.answer = 'mutated externally';
  assert.equal(completed.data.turns[0].answer, 'Respuesta');
  assert.throws(() => completed.data.turns.push(turn), TypeError);
  assert.throws(() => original.append({ ...turn, answer: ' ' }), /Respuesta/);
  assert.throws(() => original.append({ ...turn, prompt: '' }), /Consulta/);
});

test('portable source paths reject traversal, private files, Windows aliases and control characters', () => {
  for (const value of ['../a', '/etc/passwd', 'a/../../b', 'C:/file', 'a\\b', 'a//b', '.', 'a/NUL.txt', 'con', 'a./b', 'a /b', 'x:y', '.git/config', '.env', '.env.production', 'id_rsa', 'foo/private.key', 'x\nfile']) {
    assert.throws(() => new SourcePath(value), undefined, value);
  }
  assert.equal(new SourcePath('src/domain/task.ts').value, 'src/domain/task.ts');
  assert.equal(new SourcePath('.env.example').value, '.env.example');
});

test('proposal lifecycle requires a proposal before application and a journal before recovery', () => {
  const proposed = new Proposal({ id: 'proposal-1', root: 'root', instruction: 'change', summary: 'Change one file', createdAt: 'now', status: 'proposed', revision: 0, changes: [{ path: 'src/a.ts', beforeHash: null, after: 'const a = 1;' }], backups: {} });
  assert.throws(() => proposed.transition('applied'), /No se permite/);
  const applying = proposed.transition('applying', { 'src/a.ts': null });
  const applied = applying.transition('applied');
  assert.equal(applied.data.revision, 2);
  assert.throws(() => applied.transition('applying'), /No se permite/);
  assert.equal(applied.transition('restoring').transition('restored').data.status, 'restored');
  assert.throws(() => new Proposal({ ...proposed.data, changes: [...proposed.data.changes, { path: 'SRC/A.ts', beforeHash: null, after: 'x' }] }), /duplicado/);
  assert.throws(() => new Proposal({ ...proposed.data, changes: [{ path: 'src/a', beforeHash: null, after: 'x' }, { path: 'src/a/b', beforeHash: null, after: 'y' }] }), /directorio/);
  for (const text of ['invalid\0text', '\uD800', 'x'.repeat(200001)]) {
    assert.throws(() => new Proposal({ ...proposed.data, changes: [{ path: 'src/a.ts', beforeHash: null, after: text }] }), /UTF-8/);
  }
  assert.doesNotThrow(() => new Proposal({ ...proposed.data, changes: [{ path: 'src/a.ts', beforeHash: null, after: 'Español 🛡️' }] }));
});

test('domain and application imports obey dependency direction', () => {
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(directory, e.name)) : [path.join(directory, e.name)]);
  for (const file of walk(path.join(cliRoot, 'src'))) {
    const relative = path.relative(cliRoot, file).replaceAll('\\', '/');
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const imports = source.statements.filter(ts.isImportDeclaration).map(statement => statement.moduleSpecifier.text);
    if (relative.includes('/domain/')) {
      for (const dependency of imports) assert.doesNotMatch(dependency, /(?:node:|application|infrastructure|presentation)/, relative);
    } else if (relative.includes('/application/')) {
      for (const dependency of imports) assert.doesNotMatch(dependency, /(?:node:|infrastructure|presentation)/, relative);
    }
  }
});
