import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { SqliteStore } from '../dist/infrastructure/sqlite-store.js';
import { LocalChangeWorkspace } from '../dist/infrastructure/change-workspace.js';
import { LocalWorkspace } from '../dist/infrastructure/workspace.js';
import { ChangeCode } from '../dist/changes/application/change-code.js';
import { temporary, write, run, identity } from './helpers.mjs';

function fixture(t) {
  const root = temporary(t),
    home = temporary(t);
  const store = new SqliteStore(home);
  t.after(() => store.close());
  const workspace = new LocalChangeWorkspace();
  const service = new ChangeCode(store.proposals, workspace, identity);
  return {
    root: fs.realpathSync(root),
    home,
    store,
    workspace,
    service,
    scan: () => new LocalWorkspace().scan(root),
  };
}

test('review/apply/restore round trip preserves original bytes, removes new files and restores deletions', (t) => {
  const f = fixture(t);
  write(f.root, 'a.ts', 'export const a = 1;\r\n');
  write(f.root, 'old.txt', 'original\n');
  const proposal = f.service.create(f.scan(), 'Actualiza a', {
    summary: 'Bounded change',
    changes: [
      { path: 'a.ts', content: 'export const a = 2;\n' },
      { path: 'src/new.ts', content: 'new\n' },
      { path: 'old.txt', content: null },
    ],
  });
  assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'export const a = 1;\r\n');
  const diff = run(['diff', proposal.id, '--json'], f.home);
  assert.equal(diff.status, 0, diff.stderr);
  assert.ok(JSON.parse(diff.stdout).diff.includes('+export const a = 2;'));
  assert.equal(f.service.apply(proposal.id).status, 'applied');
  assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'export const a = 2;\n');
  assert.equal(fs.existsSync(path.join(f.root, 'old.txt')), false);
  assert.throws(() => f.service.apply(proposal.id), /no se puede aplicar/);
  assert.equal(f.service.restore(proposal.id).status, 'restored');
  assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'export const a = 1;\r\n');
  assert.equal(fs.readFileSync(path.join(f.root, 'old.txt'), 'utf8'), 'original\n');
  assert.equal(fs.existsSync(path.join(f.root, 'src/new.ts')), false);
});

test('preflight conflict prevents every write, including files earlier in the proposal', (t) => {
  const f = fixture(t);
  write(f.root, 'a.ts', 'a');
  write(f.root, 'b.ts', 'b');
  const p = f.service.create(f.scan(), 'change', {
    summary: 'two files',
    changes: [
      { path: 'a.ts', content: 'new a' },
      { path: 'b.ts', content: 'new b' },
    ],
  });
  write(f.root, 'b.ts', 'user edit');
  assert.throws(() => f.service.apply(p.id), /Conflicto/);
  assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'a');
  assert.equal(f.store.proposals.get(p.id).data.status, 'proposed');
});

test('restore refuses to overwrite later user changes and leaves other files untouched', (t) => {
  const f = fixture(t);
  write(f.root, 'a.ts', 'a');
  write(f.root, 'b.ts', 'b');
  const p = f.service.create(f.scan(), 'change', {
    summary: 'two files',
    changes: [
      { path: 'a.ts', content: 'new a' },
      { path: 'b.ts', content: 'new b' },
    ],
  });
  f.service.apply(p.id);
  write(f.root, 'b.ts', 'user edit');
  assert.throws(() => f.service.restore(p.id), /cambios posteriores/);
  assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'new a');
  assert.equal(fs.readFileSync(path.join(f.root, 'b.ts'), 'utf8'), 'user edit');
});

test('I/O failure during apply restores files already written using the durable journal', (t) => {
  const f = fixture(t);
  write(f.root, 'a.ts', 'a');
  write(f.root, 'b.ts', 'b');
  let writes = 0;
  const failing = {
    read: (...args) => f.workspace.read(...args),
    withLock: (...args) => f.workspace.withLock(...args),
    replace: (...args) => {
      if (++writes === 2) throw new Error('injected disk failure');
      f.workspace.replace(...args);
    },
  };
  const service = new ChangeCode(f.store.proposals, failing, identity);
  const p = service.create(f.scan(), 'change', {
    summary: 'two files',
    changes: [
      { path: 'a.ts', content: 'new a' },
      { path: 'b.ts', content: 'new b' },
    ],
  });
  assert.throws(() => service.apply(p.id), /restauró el contenido original/);
  assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'a');
  assert.equal(fs.readFileSync(path.join(f.root, 'b.ts'), 'utf8'), 'b');
  assert.equal(f.store.proposals.get(p.id).data.status, 'restored');
});

test('interrupted applying state can be recovered from a new process', (t) => {
  const f = fixture(t);
  write(f.root, 'a.ts', 'a');
  write(f.root, 'b.ts', 'b');
  const data = f.service.create(f.scan(), 'change', {
    summary: 'interrupted operation',
    changes: [
      { path: 'a.ts', content: 'new a' },
      { path: 'b.ts', content: 'new b' },
    ],
  });
  const original = f.store.proposals.get(data.id);
  const applying = original.transition('applying', { 'a.ts': 'a', 'b.ts': 'b' });
  f.store.proposals.save(applying, original.data.revision);
  f.workspace.replace(f.root, 'a.ts', 'new a');
  const recovery = run(['restore', data.id, '--json'], f.home);
  assert.equal(recovery.status, 0, recovery.stderr);
  assert.equal(JSON.parse(recovery.stdout).status, 'restored');
  assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'a');
});

test('proposal rejects protected targets, excluded existing files and non-changes', (t) => {
  const f = fixture(t);
  write(f.root, 'a.ts', 'a');
  write(f.root, '.gitignore', 'ignored.ts');
  write(f.root, 'ignored.ts', 'ignored');
  for (const change of [
    { path: '../outside', content: 'bad' },
    { path: '.env', content: 'bad' },
    { path: 'ignored.ts', content: 'new' },
    { path: 'a.ts', content: 'a' },
  ]) {
    assert.throws(() =>
      f.service.create(f.scan(), 'change', { summary: 'bad', changes: [change] }),
    );
  }
});

test('workspace operations are exclusive while another operation holds the lock', (t) => {
  const f = fixture(t);
  const second = new LocalChangeWorkspace();
  f.workspace.withLock(f.root, () =>
    assert.throws(() => second.withLock(f.root, () => {}), /otra operación/),
  );
  assert.doesNotThrow(() => second.withLock(f.root, () => {}));
});

test('a killed lock owner releases its OS lock without deleting stale files', async (t) => {
  const f = fixture(t);
  const module = new URL('../dist/infrastructure/change-workspace.js', import.meta.url).href;
  const script = `const { LocalChangeWorkspace } = await import(${JSON.stringify(module)}); new LocalChangeWorkspace().withLock(${JSON.stringify(f.root)}, () => { process.stdout.write('locked'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0); });`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  });
  const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);
  try {
    const ready = await Promise.race([
      once(child.stdout, 'data').then(([data]) => data.toString()),
      once(child, 'exit').then(() => {
        throw new Error('lock owner exited before becoming ready');
      }),
    ]);
    assert.equal(ready, 'locked');
    assert.throws(() => new LocalChangeWorkspace().withLock(f.root, () => {}), /otra operación/);
    const exited = once(child, 'exit');
    child.kill('SIGKILL');
    await exited;
    assert.doesNotThrow(() => new LocalChangeWorkspace().withLock(f.root, () => {}));
  } finally {
    clearTimeout(timer);
  }
});

test('deleting a source after the snapshot cannot silently turn an edit into a new file', (t) => {
  const f = fixture(t);
  write(f.root, 'a.ts', 'original');
  const snapshot = f.scan();
  fs.unlinkSync(path.join(f.root, 'a.ts'));
  assert.throws(
    () =>
      f.service.create(snapshot, 'change', {
        summary: 'changed',
        changes: [{ path: 'a.ts', content: 'replacement' }],
      }),
    /cambió durante/,
  );
  assert.deepEqual(f.store.proposals.list(), []);
});

test('offline JSON import supports the complete CLI workflow without a model', (t) => {
  const root = temporary(t),
    home = temporary(t),
    input = temporary(t);
  write(root, 'a.ts', 'old\n');
  const json = write(
    input,
    'changes.json',
    JSON.stringify({ summary: 'Local change', changes: [{ path: 'a.ts', content: 'new\n' }] }),
  );
  const result = run(['propose', '--from', json, '--path', root, '--json'], home);
  assert.equal(result.status, 0, result.stderr);
  const proposal = JSON.parse(result.stdout);
  assert.equal(fs.readFileSync(path.join(root, 'a.ts'), 'utf8'), 'old\n');
  assert.equal(run(['apply', proposal.id, '--json'], home).status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'a.ts'), 'utf8'), 'new\n');
  assert.equal(run(['restore', proposal.id, '--json'], home).status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'a.ts'), 'utf8'), 'old\n');
});
