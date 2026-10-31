import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { temporary, write, run, identity } from './helpers.mjs';
import { TeamPolicy } from '../dist/collaboration/domain/team-policy.js';
import { ChangeBundle } from '../dist/collaboration/domain/change-bundle.js';
import { SqliteStore } from '../dist/infrastructure/sqlite-store.js';
import { Proposal } from '../dist/changes/domain/proposal.js';
import { loadConfiguration } from '../dist/infrastructure/configuration.js';
import { hash } from '../dist/infrastructure/workspace.js';

function invoke(home, args, options = {}) {
  const result = run([...args, '--json'], home, options);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function fixture(t, ending = '\n') {
  const root = temporary(t),
    home = temporary(t);
  write(root, 'src/value.js', `export const value = 1;${ending}`);
  write(
    root,
    'package.json',
    JSON.stringify({
      type: 'module',
      scripts: {
        test: `node -e "import('./src/value.js').then(m=>{if(m.value!==2)process.exitCode=1})"`,
      },
    }),
  );
  return { root, home };
}
function proposalFor(person) {
  const payload = write(
    person.home,
    'change.json',
    JSON.stringify({
      summary: 'Team change',
      changes: [
        { path: 'src/value.js', content: 'export const value = 2;\n' },
        { path: 'note.md', content: '# Reviewed change\n' },
      ],
    }),
  );
  return invoke(person.home, ['propose', '--path', person.root, '--from', payload]);
}

test('team policies reject credentials, unknown fields and executable script syntax', () => {
  const base = { version: 1, name: 'Five developers', checks: ['test', 'typecheck'] };
  const policy = new TeamPolicy(base);
  base.checks.push('lint');
  assert.deepEqual(policy.data.checks, ['test', 'typecheck']);
  for (const bad of [
    { ...base, apiKey: 'private' },
    { ...base, checks: ['test && echo unsafe'] },
    { ...base, checks: ['test', 'test'] },
    { ...base, version: 2 },
    { ...base, ai: { provider: 'groq', model: 'chosen', key: 'private' } },
    { ...base, ai: { provider: 'groq' } },
    { ...base, name: '\x1bunsafe' },
  ])
    assert.throws(() => new TeamPolicy(bad));
});

test('team init shares agreements without executing scripts or overwriting configuration', (t) => {
  const root = temporary(t),
    home = temporary(t);
  write(
    root,
    'package.json',
    JSON.stringify({ scripts: { check: 'node -e "process.exit(7)"', test: 'node --test' } }),
  );
  const result = invoke(home, ['--project', root, 'team', 'init', '--name', 'Equipo de cinco']);
  assert.deepEqual(result.checks, ['check']);
  assert(!fs.existsSync(path.join(root, 'ares.sqlite')));
  assert.equal(invoke(home, ['--project', root, 'team', 'show']).name, 'Equipo de cinco');
  const again = run(['--project', root, 'team', 'init', '--json'], home);
  assert.notEqual(again.status, 0);
  assert.equal(invoke(home, ['verifications', 'list']).length, 0);
  const noNode = temporary(t);
  assert.deepEqual(invoke(home, ['--project', noNode, 'team', 'init']).checks, []);
});

test('team defaults remain below personal project preferences, dotenv and explicit flags', (t) => {
  const root = temporary(t),
    home = temporary(t);
  write(
    home,
    '.env',
    'ARES_PROVIDER=compatible\nARES_MODEL=personal-local\nARES_BASE_URL=http://localhost:11434/v1\n',
  );
  write(
    root,
    'ares.team.json',
    JSON.stringify({
      version: 1,
      name: 'Team',
      checks: [],
      ai: { provider: 'gemini', model: 'team-model' },
    }),
  );
  let doctor = invoke(home, ['--project', root, 'doctor']);
  assert.equal(doctor.provider, 'gemini');
  assert.equal(doctor.model, 'team-model');
  assert.equal(doctor.baseUrl, 'https://generativelanguage.googleapis.com/v1beta/openai');
  invoke(home, ['projects', 'add', 'mine', root]);
  invoke(home, ['projects', 'configure', 'mine', '--provider', 'groq', '--model', 'local-project']);
  assert.equal(invoke(home, ['--project', '@mine', 'doctor']).model, 'local-project');
  write(root, '.env', 'GROQ_MODEL=folder-model\n');
  assert.equal(invoke(home, ['--project', '@mine', 'doctor']).model, 'folder-model');
  assert.equal(
    invoke(home, ['--project', '@mine', 'doctor'], { env: { ARES_MODEL: 'environment-model' } })
      .model,
    'environment-model',
  );
  assert.equal(
    invoke(home, ['--project', '@mine', '--model', 'explicit', 'doctor']).model,
    'explicit',
  );
  const selected = loadConfiguration({}, { ARES_HOME: home }, root, undefined, {
    provider: 'gemini',
    model: 'team',
  });
  assert.equal(selected.model, 'team');
});

test('team check records actual results and stops after a failed script', (t) => {
  const root = temporary(t),
    home = temporary(t);
  write(
    root,
    'ares.team.json',
    JSON.stringify({ version: 1, name: 'Team', checks: ['ok', 'fail', 'later'] }),
  );
  write(
    root,
    'package.json',
    JSON.stringify({
      scripts: {
        ok: 'node -e "console.log(42)"',
        fail: 'node -e "process.exit(3)"',
        later: 'node -e "process.exit(0)"',
      },
    }),
  );
  const result = run(['--project', root, 'team', 'check', '--json'], home);
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(
    report.records.map((record) => record.status),
    ['passed', 'failed'],
  );
  assert.deepEqual(report.notRun, ['later']);
  assert.match(report.records[0].stdout, /42/);
  assert.equal(invoke(home, ['verifications', 'list']).length, 2);
});

test('team check validates all scripts before executing any of them', (t) => {
  const root = temporary(t),
    home = temporary(t);
  write(
    root,
    'ares.team.json',
    JSON.stringify({ version: 1, name: 'Team', checks: ['ok', 'missing'] }),
  );
  write(root, 'package.json', JSON.stringify({ scripts: { ok: 'node -e "process.exit(0)"' } }));
  assert.notEqual(run(['--project', root, 'team', 'check', '--json'], home).status, 0);
  assert.equal(invoke(home, ['verifications', 'list']).length, 0);
});

test('five separate developers exchange proposals, review, verify locally and restore CRLF or LF originals', (t) => {
  const people = Array.from({ length: 5 }, (_, index) => fixture(t, index % 2 ? '\r\n' : '\n'));
  const first = people[0],
    proposal = proposalFor(first);
  const archive = path.join(first.home, 'review.ares-change.json');
  const exported = invoke(first.home, ['handoff', 'export', proposal.id, '-o', archive]);
  const bundle = JSON.parse(fs.readFileSync(archive, 'utf8'));
  assert(!Object.hasOwn(bundle, 'root'));
  assert(!Object.hasOwn(bundle, 'backups'));
  assert(!Object.hasOwn(bundle, 'instruction'));
  assert(!fs.readFileSync(archive, 'utf8').includes(first.root));
  fs.writeFileSync(
    archive,
    Buffer.concat([Buffer.from([239, 187, 191]), fs.readFileSync(archive)]),
  );
  assert.equal(invoke(first.home, ['handoff', 'inspect', archive]).digest, exported.digest);
  invoke(first.home, ['apply', proposal.id]);
  assert.equal(invoke(first.home, ['verify', proposal.id]).status, 'passed');
  const appliedArchive = path.join(first.home, 'after-tests.json');
  assert.equal(
    invoke(first.home, ['handoff', 'export', proposal.id, '-o', appliedArchive]).digest,
    exported.digest,
  );
  const ids = new Set([proposal.id]);
  for (const person of people.slice(1)) {
    const before = fs.readFileSync(path.join(person.root, 'src/value.js'), 'utf8');
    const imported = invoke(person.home, ['--project', person.root, 'handoff', 'import', archive]);
    ids.add(imported.id);
    assert.equal(imported.root, fs.realpathSync(person.root));
    assert.equal(fs.readFileSync(path.join(person.root, 'src/value.js'), 'utf8'), before);
    assert(!fs.existsSync(path.join(person.root, 'note.md')));
    assert.match(invoke(person.home, ['diff', imported.id]).diff, /value = 2/);
    invoke(person.home, ['apply', imported.id]);
    assert.equal(invoke(person.home, ['verify', imported.id]).status, 'passed');
    if (before.includes('\r\n'))
      assert.equal(
        fs.readFileSync(path.join(person.root, 'src/value.js'), 'utf8'),
        'export const value = 2;\r\n',
      );
    invoke(person.home, ['restore', imported.id]);
    assert.equal(fs.readFileSync(path.join(person.root, 'src/value.js'), 'utf8'), before);
    assert(!fs.existsSync(path.join(person.root, 'note.md')));
  }
  assert.equal(ids.size, 5);
  invoke(first.home, ['restore', proposal.id]);
});

test('tampered bundles and diverged clones do not create proposals or touch files', (t) => {
  const source = fixture(t),
    target = fixture(t),
    proposal = proposalFor(source);
  const archive = path.join(source.home, 'review.json');
  invoke(source.home, ['handoff', 'export', proposal.id, '-o', archive]);
  const tampered = JSON.parse(fs.readFileSync(archive, 'utf8'));
  tampered.summary = 'Changed after export';
  const changed = write(source.home, 'tampered.json', JSON.stringify(tampered));
  assert.notEqual(run(['handoff', 'inspect', changed, '--json'], target.home).status, 0);
  assert.notEqual(
    run(['--project', target.root, 'handoff', 'import', changed, '--json'], target.home).status,
    0,
  );
  write(target.root, 'src/value.js', 'export const value = 9;\n');
  assert.notEqual(
    run(['--project', target.root, 'handoff', 'import', archive, '--json'], target.home).status,
    0,
  );
  assert.equal(invoke(target.home, ['proposals']).length, 0);
  assert.equal(
    fs.readFileSync(path.join(target.root, 'src/value.js'), 'utf8'),
    'export const value = 9;\n',
  );
  assert(!fs.existsSync(path.join(target.root, 'note.md')));
});

test('bundle protocol rejects private paths, extra local data, duplicate names and oversized text', () => {
  const base = {
    format: 'ares-change',
    version: 1,
    createdAt: identity.now(),
    summary: 'Review',
    digest: '0'.repeat(64),
    changes: [{ path: 'src/file.js', beforeHash: null, after: 'text\n' }],
  };
  assert.equal(new ChangeBundle(base).data.changes.length, 1);
  for (const bad of [
    { ...base, root: 'C:/private' },
    { ...base, version: 2 },
    { ...base, changes: [{ ...base.changes[0], path: '.env' }] },
    { ...base, changes: [{ ...base.changes[0], path: '../file.js' }] },
    { ...base, changes: [base.changes[0], { ...base.changes[0], path: 'SRC/FILE.js' }] },
    { ...base, changes: [{ ...base.changes[0], after: 'x'.repeat(200001) }] },
  ])
    assert.throws(() => new ChangeBundle(bad));
});

test('known credentials cannot be exported even from an older unsanitized proposal', (t) => {
  const person = fixture(t),
    secret = 'cohere-private-fixture-value';
  write(person.home, '.env', 'COHERE_API_KEY=' + secret + '\n');
  const store = new SqliteStore(person.home);
  const proposal = new Proposal({
    id: identity.next(),
    root: person.root,
    instruction: 'Fixture',
    summary: 'Fixture',
    createdAt: identity.now(),
    status: 'proposed',
    revision: 0,
    backups: {},
    changes: [
      {
        path: 'src/value.js',
        beforeHash: hash('export const value = 1;\n'),
        after: `export const value = "${secret}";\n`,
      },
    ],
  });
  store.proposals.save(proposal, null);
  store.close();
  const archive = path.join(person.home, 'unsafe.json');
  const result = run(['handoff', 'export', proposal.data.id, '-o', archive, '--json'], person.home);
  assert.notEqual(result.status, 0);
  assert(!result.stdout.includes(secret));
  assert(!result.stderr.includes(secret));
  assert(!fs.existsSync(archive));
  const unsafe = write(
    person.home,
    'unsafe-input.json',
    JSON.stringify({
      format: 'ares-change',
      version: 1,
      createdAt: identity.now(),
      summary: 'Fixture',
      digest: '0'.repeat(64),
      changes: [{ path: secret + ':file.js', beforeHash: null, after: 'fixture' }],
    }),
  );
  const inspected = run(['handoff', 'inspect', unsafe, '--json'], person.home);
  assert.notEqual(inspected.status, 0);
  assert(!inspected.stderr.includes(secret));
});

test('team files and bundles reject links and malformed JSON without echoing its contents', (t) => {
  const person = fixture(t);
  const invalid = write(person.home, 'invalid.json', 'not-json-private-fixture');
  const result = run(['handoff', 'inspect', invalid, '--json'], person.home);
  assert.notEqual(result.status, 0);
  assert(!result.stderr.includes('not-json-private-fixture'));
  const linked = path.join(person.home, 'linked.json');
  fs.linkSync(invalid, linked);
  assert.notEqual(run(['handoff', 'inspect', linked, '--json'], person.home).status, 0);
  fs.unlinkSync(linked);
});
