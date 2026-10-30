import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LocalWorkspace, readCurrent } from '../dist/infrastructure/workspace.js';
import { contextText, redact, terminalText } from '../dist/infrastructure/text.js';
import { loadConfiguration } from '../dist/infrastructure/configuration.js';
import { temporary, write, run } from './helpers.mjs';

test('workspace honors nested gitignore and aresignore, excludes private files and binary data', t => {
  const root = temporary(t);
  write(root, '.gitignore', 'ignored/\n*.tmp\n');
  write(root, '.aresignore', 'private-notes.md\n');
  write(root, '.env', 'GEMINI_API_KEY=private'); write(root, '.env.example', 'GEMINI_API_KEY=');
  write(root, 'node_modules/pkg/index.js', 'external'); write(root, 'ignored/file.ts', 'ignored');
  write(root, 'private-notes.md', 'private'); write(root, 'file.tmp', 'ignored');
  write(root, 'src/.gitignore', '*.generated.ts\n'); write(root, 'src/test.generated.ts', 'ignored');
  write(root, 'src/a.ts', 'export const a = 1;'); write(root, 'file.bin', Buffer.from([0, 255]));
  const result = new LocalWorkspace().scan(root);
  const paths = result.files.map(f => f.path);
  assert.ok(paths.includes('src/a.ts')); assert.ok(paths.includes('.env.example'));
  for (const name of ['.env', 'src/test.generated.ts', 'ignored/file.ts', 'private-notes.md', 'file.tmp', 'file.bin', 'node_modules/pkg/index.js']) assert.ok(!paths.includes(name), name);
  assert.ok(result.skipped >= 7); assert.equal(result.truncated, false);
  assert.throws(() => new LocalWorkspace().scan(path.join(root, '.env')), /privada/);
});

test('workspace reports its limits and refuses to follow directory junctions', t => {
  const root = temporary(t), outside = temporary(t);
  write(root, 'a.ts', 'x'); write(root, 'b.ts', 'y'); write(outside, 'outside.ts', 'outside');
  fs.symlinkSync(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = new LocalWorkspace({ maxFiles: 1, maxFileBytes: 100, maxBytes: 100 }).scan(root);
  assert.equal(result.files.length, 1); assert.equal(result.truncated, true);
  assert.throws(() => readCurrent(fs.realpathSync(root), 'linked/outside.ts'), /enlaces/);
});

test('scanning a subdirectory or explicit file inherits ignores from the repository root', t => {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, '.git'));
  write(root, '.gitignore', 'src/hidden/\nsrc/ignored.ts\n');
  write(root, 'src/visible.ts', 'visible'); write(root, 'src/ignored.ts', 'ignored'); write(root, 'src/hidden/private.ts', 'private');
  const workspace = new LocalWorkspace();
  assert.deepEqual(workspace.scan(path.join(root, 'src')).files.map(f => f.path), ['visible.ts']);
  assert.equal(workspace.scan(path.join(root, 'src/ignored.ts')).files.length, 0);
  assert.equal(workspace.scan(path.join(root, 'src/hidden')).files.length, 0);
});

test('context redacts credentials and neutralizes terminal control sequences', () => {
  const raw = 'const apiKey = "sk-or-v1-' + 'a'.repeat(40) + '";\npassword="long-secret-value"';
  const formatted = contextText({ root: '.', files: [{ path: 'config.ts', content: raw }], skipped: 0, truncated: false });
  assert.ok(formatted.includes('REDACTED')); assert.ok(!formatted.includes('a'.repeat(40))); assert.ok(!formatted.includes('long-secret-value'));
  assert.equal(terminalText('\x1b]52;c;base64\x07OK\x1b[2J'), 'OK');
  assert.equal(redact('Bearer long-token-here'), 'Bearer [REDACTED]');
});

test('configuration precedence is environment > cwd .env > personal .env and keys never appear in doctor', t => {
  const home = temporary(t), cwd = temporary(t);
  write(home, '.env', 'ARES_PROVIDER=gemini\nARES_MODEL=personal-model\nGEMINI_API_KEY=personal-secret\n');
  write(cwd, '.env', 'ARES_MODEL=project-model\n');
  const configured = loadConfiguration({}, { ARES_HOME: home, ARES_MODEL: 'environment-model' }, cwd);
  assert.equal(configured.model, 'environment-model'); assert.equal(configured.apiKey, 'personal-secret');
  assert.equal(loadConfiguration({}, { ARES_HOME: home }, cwd).model, 'project-model');
  const result = run(['doctor', '--json'], home, { cwd });
  assert.equal(result.status, 0, result.stderr); assert.ok(!result.stdout.includes('personal-secret'));
  assert.equal(JSON.parse(result.stdout).connectionVerified, false);
  for (const url of ['http://remote.example/v1', 'https://user:pass@example.org/v1', 'https://example.org/v1?key=secret']) {
    assert.throws(() => loadConfiguration({}, { ARES_HOME: home, ARES_BASE_URL: url }, cwd), /HTTPS|credenciales/);
  }
  assert.throws(() => loadConfiguration({}, { ARES_HOME: home, ARES_BASE_URL: 'https://other-host.example/v1' }, cwd), /COMPATIBLE_API_KEY/);
});

test('audit emits located signals without leaking source secrets and uses meaningful exit codes', t => {
  const root = temporary(t);
  write(root, 'src/a.ts', 'eval(input);\nconst apiKey = "' + 'z'.repeat(32) + '";');
  const result = run(['audit', root, '--fail-on', 'high', '--json'], path.join(root, 'home'));
  assert.equal(result.status, 1); const report = JSON.parse(result.stdout);
  assert.ok(report.findings.some(f => f.rule === 'dynamic-eval' && f.line === 1));
  assert.ok(report.findings.some(f => f.rule === 'embedded-secret' && f.line === 2));
  assert.ok(!result.stdout.includes('z'.repeat(32)));
  const missing = run(['audit', path.join(root, 'missing'), '--json'], path.join(root, 'home'));
  assert.equal(missing.status, 1); assert.equal(JSON.parse(missing.stderr).error.code, 'NOT_FOUND');
});
