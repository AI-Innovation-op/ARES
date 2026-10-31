import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import { cliRoot, temporary, run, write } from './helpers.mjs';

test('forged DDD project runs, persists state across processes and passes its own tests without npm install', (t) => {
  const root = temporary(t),
    home = temporary(t),
    destination = path.join(root, 'project with spaces');
  const result = run(['forge', destination, '--name', 'Proyecto personal', '--json'], home);
  assert.equal(result.status, 0, result.stderr);
  const exec = (args) =>
    spawnSync(process.execPath, args, { cwd: destination, encoding: 'utf8', timeout: 20_000 });
  const added = exec(['src/main.ts', 'add', 'Completar la CLI']);
  assert.equal(added.status, 0, added.stderr);
  const task = JSON.parse(added.stdout);
  assert.equal(task.title, 'Completar la CLI');
  assert.equal(task.status, 'pending');
  assert.equal(exec(['src/main.ts', 'complete', task.id]).status, 0);
  const list = exec(['src/main.ts', 'list']);
  assert.equal(JSON.parse(list.stdout)[0].status, 'completed');
  assert.equal(exec(['src/main.ts', 'complete', task.id]).status, 1);
  const tests = exec(['--test', 'test/*.test.ts']);
  assert.equal(tests.status, 0, tests.stdout + tests.stderr);
  const tsc = spawnSync(
    process.execPath,
    [
      path.join(cliRoot, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
      '--typeRoots',
      path.join(cliRoot, 'node_modules/@types'),
    ],
    { cwd: destination, encoding: 'utf8' },
  );
  assert.equal(tsc.status, 0, tsc.stdout + tsc.stderr);
  assert.equal(run(['forge', destination, '--json'], home).status, 1);
});

test('source archive excludes private paths and redacts embedded credentials', async (t) => {
  const root = temporary(t),
    home = temporary(t),
    archive = path.join(home, 'sources.zip');
  write(root, 'src/config.ts', 'const apiKey = "sk-or-v1-' + 'a'.repeat(40) + '";');
  write(root, '.env', 'private-key');
  write(root, '.gitignore', 'notes.txt\n');
  write(root, 'notes.txt', 'private');
  const result = run(['zip', root, archive, '--json'], home);
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(fs.readFileSync(archive));
  assert.equal(zip.file('.env'), null);
  assert.equal(zip.file('notes.txt'), null);
  assert.ok((await zip.file('src/config.ts').async('string')).includes('REDACTED'));
  assert.equal(run(['zip', root, archive, '--json'], home).status, 1);
});

test('CLI fails clearly for missing configuration, invalid flags and empty piped input', (t) => {
  const home = temporary(t);
  const noConfig = run(['ask', 'hello', '--json'], home);
  assert.equal(noConfig.status, 2);
  assert.equal(JSON.parse(noConfig.stderr).error.code, 'CONFIG');
  assert.equal(run(['ask', '--json'], home, { input: '' }).status, 2);
  assert.equal(run(['not-a-command'], home).status, 2);
  assert.equal(JSON.parse(run(['not-a-command', '--json'], home).stderr).error.code, 'VALIDATION');
  assert.equal(run(['--version'], home).stdout.trim(), '5.2.1');
  const initialized = run(
    ['config', 'init', '--provider', 'compatible', '--model', 'local-model', '--json'],
    home,
  );
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.ok(fs.readFileSync(path.join(home, '.env'), 'utf8').includes('ARES_MODEL=local-model'));
  assert.equal(run(['config', 'init', '--json'], home).status, 1);
});
