import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Verification } from '../dist/verification/domain/verification.js';
import { NodeProjectChecks } from '../dist/infrastructure/project-checks.js';
import { VerifyProject } from '../dist/verification/application/verify-project.js';
import { LocalChangeWorkspace } from '../dist/infrastructure/change-workspace.js';
import { SqliteStore } from '../dist/infrastructure/sqlite-store.js';
import { temporary, write, run, runAsync, identity } from './helpers.mjs';

function project(t, code, extras = {}) {
  const root = temporary(t),
    home = temporary(t);
  write(
    root,
    'package.json',
    JSON.stringify({ type: 'module', scripts: { test: 'node check.mjs', ...extras } }),
  );
  write(root, 'check.mjs', code);
  return { root, home };
}

test('verify executes a real script and its immutable evidence survives a new process', async (t) => {
  const { root, home } = project(t, 'console.log("real output");');
  const result = await runAsync(['verify', '--path', root, '--json'], home);
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.status, 'passed');
  assert.equal(data.exitCode, 0);
  assert.match(data.stdout, /real output/);
  assert.ok(data.durationMs >= 0);
  assert.equal(data.stateChanged, false);
  assert.match(data.inputFingerprint, /^[a-f0-9]{64}$/);
  const read = run(['verifications', 'show', data.id, '--json'], home);
  assert.deepEqual(JSON.parse(read.stdout), {
    ...data,
    matchesCurrentState: true,
    currentStatus: 'passed',
  });
  write(root, 'check.mjs', 'console.log("later source");');
  const later = JSON.parse(run(['verifications', 'show', data.id, '--json'], home).stdout);
  assert.equal(later.status, 'passed');
  assert.equal(later.currentStatus, 'stale');
  assert.equal(later.matchesCurrentState, false);
  const list = JSON.parse(run(['verifications', 'list', '--json'], home).stdout);
  assert.equal(list[0].id, data.id);
  assert.equal(list[0].stdout, undefined);
  assert.throws(() => new Verification({ ...data, status: 'passed', exitCode: 1 }), /solo aprueba/);
});

test('failed, missing and injected script names cannot produce successful evidence', async (t) => {
  const { root, home } = project(t, 'console.error("check failed"); process.exitCode = 7;');
  const failed = await runAsync(['verify', '--path', root, '--json'], home);
  assert.equal(failed.status, 1, failed.stderr);
  assert.notEqual(JSON.parse(failed.stdout).exitCode, 0);
  assert.equal(JSON.parse(failed.stdout).status, 'failed');
  assert.match(JSON.parse(failed.stdout).stderr, /check failed/);
  for (const script of ['missing', 'test & echo injected', '../test']) {
    const result = await runAsync(['verify', '--path', root, '--script', script, '--json'], home);
    assert.equal(result.status, 2, result.stdout + result.stderr);
  }
  const missing = await runAsync(['verify', '--path', path.join(root, 'child'), '--json'], home);
  assert.equal(missing.status, 1);
});

test('a script that changes source cannot certify the updated project', async (t) => {
  const { root, home } = project(
    t,
    'import fs from "node:fs"; fs.writeFileSync("source.ts", "new source");',
  );
  write(root, 'source.ts', 'original source');
  const result = await runAsync(['verify', '--path', root, '--json'], home);
  assert.equal(result.status, 1, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.status, 'stale');
  assert.equal(data.stateChanged, true);
  assert.equal(data.exitCode, 0);
});

test('verification fingerprints an explicit project even when its parent Git repository ignores that directory', (t) => {
  const parent = temporary(t),
    root = path.join(parent, 'ignored');
  fs.mkdirSync(path.join(parent, '.git'));
  write(parent, '.gitignore', 'ignored/\n');
  write(root, 'package.json', JSON.stringify({ scripts: { test: 'node check.mjs' } }));
  write(root, 'check.mjs', 'console.log("before");');
  const checks = new NodeProjectChecks(),
    before = checks.plan(root, 'test');
  assert.equal(before.sourceFiles, 2);
  write(root, 'check.mjs', 'console.log("after");');
  assert.notEqual(checks.plan(root, 'test').fingerprint, before.fingerprint);
});

test('verify is tied to the applied proposal revision and rejects later edits', async (t) => {
  const { root, home } = project(t, 'console.log("checks passed");');
  write(root, 'source.ts', 'original');
  const imported = write(
    temporary(t),
    'change.json',
    JSON.stringify({
      summary: 'Example change',
      changes: [{ path: 'source.ts', content: 'updated' }],
    }),
  );
  const data = JSON.parse(
    run(['propose', '--path', root, '--from', imported, '--json'], home).stdout,
  );
  const unApplied = await runAsync(['verify', data.id, '--json'], home);
  assert.equal(unApplied.status, 1);
  assert.equal(run(['apply', data.id, '--json'], home).status, 0);
  const verified = await runAsync(['verify', data.id, '--json'], home);
  assert.equal(verified.status, 0, verified.stderr);
  const evidence = JSON.parse(verified.stdout);
  assert.equal(evidence.proposalId, data.id);
  assert.equal(evidence.proposalRevision, 2);
  write(root, 'source.ts', 'edited afterwards');
  const later = await runAsync(['verify', data.id, '--json'], home);
  assert.equal(later.status, 1);
  assert.equal(
    JSON.parse(run(['verifications', 'list', '--proposal', data.id, '--json'], home).stdout).length,
    1,
  );
});

test('timeout terminates the script process tree and records a failure', async (t) => {
  const { root, home } = project(
    t,
    `import { spawn } from 'node:child_process'; import fs from 'node:fs';
const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
fs.writeFileSync('child.pid', String(child.pid)); setInterval(() => {}, 1000);`,
  );
  write(root, '.gitignore', 'child.pid\n');
  let pid;
  t.after(() => {
    if (pid) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  });
  const result = await runAsync(['verify', '--path', root, '--timeout', '2000', '--json'], home);
  assert.equal(result.status, 1, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.status, 'timed-out');
  pid = Number(fs.readFileSync(path.join(root, 'child.pid'), 'utf8'));
  let alive = true;
  for (let i = 0; i < 30; i++) {
    try {
      process.kill(pid, 0);
    } catch {
      alive = false;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(alive, false, 'descendant still running after timeout');
  pid = undefined;
});

test('abort is different from timeout and retains a cancellation record', async (t) => {
  const { root, home } = project(t, 'setInterval(() => {}, 1000);');
  const checks = new NodeProjectChecks(),
    controller = new AbortController();
  const store = new SqliteStore(home);
  const service = new VerifyProject(
    checks,
    store.verifications,
    store.proposals,
    new LocalChangeWorkspace(),
    identity,
  );
  const running = service.execute({
    root,
    script: 'test',
    timeoutMs: 10_000,
    signal: controller.signal,
  });
  const timer = setTimeout(() => controller.abort(), 200);
  try {
    const result = await running;
    assert.equal(result.status, 'cancelled');
    assert.equal(store.verifications.get(result.id).data.status, 'cancelled');
  } finally {
    clearTimeout(timer);
    store.close();
  }
});

test('verification logs have bounded size and redact known environment credentials', async (t) => {
  const { root, home } = project(
    t,
    'process.stdout.write("x".repeat(50000) + "\\nTOKEN=" + process.env.TEST_SECRET + "\\n");',
  );
  const result = await runAsync(['verify', '--path', root, '--json'], home, {
    env: { TEST_SECRET: 'private-fixture-value-do-not-print' },
  });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.outputTruncated, true);
  assert.ok(data.stdout.length <= 32_000);
  assert.ok(!result.stdout.includes('private-fixture-value-do-not-print'));
  assert.match(data.stdout, /REDACTED/);
});

test('v1 database migration preserves conversations and proposals and adds verification storage', (t) => {
  const home = temporary(t),
    file = path.join(home, 'ares.sqlite');
  const db = new DatabaseSync(file);
  db.exec(
    'CREATE TABLE conversations (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL) STRICT; CREATE TABLE proposals (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, created_at TEXT NOT NULL, data TEXT NOT NULL) STRICT; PRAGMA user_version = 1;',
  );
  const conversation = {
    id: 'old-session',
    revision: 1,
    title: 'Existing data',
    createdAt: 'then',
    updatedAt: 'then',
    turns: [{ prompt: 'p', answer: 'a', at: 'then', model: 'fixture' }],
  };
  db.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run(
    conversation.id,
    1,
    'then',
    JSON.stringify(conversation),
  );
  db.close();
  const store = new SqliteStore(home);
  try {
    assert.deepEqual(store.conversations.get('old-session').data, conversation);
    assert.deepEqual(store.verifications.list(), []);
  } finally {
    store.close();
  }
  const reopened = new DatabaseSync(file);
  assert.equal(reopened.prepare('PRAGMA user_version').get().user_version, 2);
  reopened.close();
});
