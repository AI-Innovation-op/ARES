import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { temporary, write, run, runAsync, identity } from './helpers.mjs';
import { Project } from '../dist/projects/domain/project.js';
import { ManageProjects } from '../dist/projects/application/manage-projects.js';
import { Conversation } from '../dist/conversation/domain/conversation.js';
import { SqliteStore } from '../dist/infrastructure/sqlite-store.js';
import { openDatabase } from '../dist/infrastructure/native-sqlite.js';
import { loadConfiguration } from '../dist/infrastructure/configuration.js';

const turn = { prompt: 'invariantes', answer: 'dominio', at: '2026-10-31', model: 'fixture' };
function invoke(home, args, options = {}) {
  const result = run([...args, '--json'], home, options);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function moveFixture(root, target, parent) {
  assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(parent));
  assert.equal(path.dirname(target), fs.realpathSync(parent));
  fs.renameSync(root, target);
}
async function fixtureServer(t, home) {
  const received = [];
  const server = http.createServer(async (req, res) => {
    let text = '';
    for await (const part of req) text += part;
    received.push(JSON.parse(text));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        choices: [{ message: { content: 'Respuesta de prueba' }, finish_reason: 'stop' }],
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  write(
    home,
    '.env',
    `ARES_PROVIDER=compatible\nARES_BASE_URL=http://127.0.0.1:${server.address().port}/v1\nARES_MODEL=home-model\n`,
  );
  return received;
}

test('project aggregate preserves identity and freezes valid preferences', () => {
  const preferences = { provider: 'groq', model: 'chosen-model' };
  const project = new Project({
    id: 'project-id',
    alias: 'my_app',
    root: '/fixture',
    revision: 0,
    createdAt: 'now',
    updatedAt: 'now',
    preferences,
  });
  preferences.model = 'changed';
  assert.equal(project.data.preferences.model, 'chosen-model');
  const changed = project.relocate('/new-root', 'later').configure(undefined, 'last');
  assert.equal(changed.data.id, project.data.id);
  assert.equal(changed.data.revision, 2);
  assert.equal(changed.data.preferences, undefined);
  for (const alias of ['UPPER', 'with space', '../folder', '@name', 'a'.repeat(41)])
    assert.throws(() => new Project({ ...project.data, alias }));
  for (const preferences of [
    { provider: 'groq' },
    { provider: 'groq', model: '\x1bfoo' },
    { provider: 3, model: 'test' },
  ])
    assert.throws(() => new Project({ ...project.data, preferences }));
});

test('registration binds existing sessions atomically and rejects stale identity loss', (t) => {
  const home = temporary(t),
    root = temporary(t),
    store = new SqliteStore(home);
  t.after(() => store.close());
  const before = Conversation.start('old-session', 'now', 'Arquitectura', root).append(turn);
  store.conversations.save(before, 0);
  const service = new ManageProjects(store.projects, identity);
  const result = service.register('alpha', root);
  assert.equal(result.linkedSessions, 1);
  const bound = store.conversations.get(before.data.id);
  assert.deepEqual(bound.data, { ...before.data, projectId: result.project.id });
  assert.equal(store.conversations.search('invariantes').length, 1);
  assert.throws(
    () => store.conversations.save(before.append({ ...turn, prompt: 'stale-write' }), 1),
    /otra terminal/,
  );
  assert.deepEqual(store.conversations.search('stale'), []);
  assert.throws(() => service.register('alpha', temporary(t)), /ya pertenecen/);
  assert.throws(() => service.register('beta', root), /ya pertenecen/);
  assert.equal(store.projects.list().length, 1);
});

test('concurrent project updates use revision checks without overwriting the winner', (t) => {
  const home = temporary(t),
    root = temporary(t),
    first = new SqliteStore(home),
    second = new SqliteStore(home);
  t.after(() => {
    second.close();
    first.close();
  });
  new ManageProjects(first.projects, identity).register('alpha', root);
  const before = second.projects.byAlias('alpha');
  new ManageProjects(first.projects, identity).configure('alpha', {
    provider: 'groq',
    model: 'winner',
  });
  assert.throws(() => second.projects.save(before.relocate('/other', 'later'), 0), /otra terminal/);
  assert.equal(second.projects.byAlias('alpha').data.preferences.model, 'winner');
  assert.equal(second.projects.byAlias('alpha').data.root, root);
});

test('schema 3 upgrade backs up history and FTS before adding the project registry', (t) => {
  const home = temporary(t),
    file = path.join(home, 'ares.sqlite'),
    db = openDatabase(file);
  db.exec(
    'CREATE TABLE conversations(id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL) STRICT; CREATE VIRTUAL TABLE conversations_search USING fts5(id UNINDEXED,title,content); PRAGMA user_version=3;',
  );
  const data = Conversation.start('legacy-session', 'now', 'Historia').append(turn).data;
  db.prepare('INSERT INTO conversations VALUES(?,?,?,?)').run(
    data.id,
    data.revision,
    data.updatedAt,
    JSON.stringify(data),
  );
  db.prepare('INSERT INTO conversations_search VALUES(?,?,?)').run(
    data.id,
    data.title,
    'invariantes dominio',
  );
  db.close();
  const store = new SqliteStore(home);
  assert.deepEqual(store.conversations.get(data.id).data, data);
  assert.equal(store.conversations.search('dominio').length, 1);
  store.close();
  const backups = fs.readdirSync(home).filter((name) => name.startsWith('ares-schema-3-backup-'));
  assert.equal(backups.length, 1);
  const backup = openDatabase(path.join(home, backups[0]));
  assert.equal(backup.prepare('PRAGMA user_version').get().user_version, 3);
  assert.equal(JSON.parse(backup.prepare('SELECT data FROM conversations').get().data).revision, 1);
  backup.close();
  const reopened = new SqliteStore(home);
  reopened.close();
  assert.equal(
    fs.readdirSync(home).filter((name) => name.startsWith('ares-schema-3-backup-')).length,
    1,
  );
});

test('project preferences respect flags, environment and project dotenv without borrowing another provider model', (t) => {
  const home = temporary(t),
    root = temporary(t);
  write(
    home,
    '.env',
    'ARES_PROVIDER=compatible\nARES_BASE_URL=http://localhost:11434/v1\nARES_MODEL=personal-local\nGROQ_MODEL=personal-groq\nCOHERE_MODEL=personal-cohere\n',
  );
  const env = { ARES_HOME: home },
    profile = { provider: 'gemini', model: 'project-gemini' };
  const config = loadConfiguration({}, env, root, profile);
  assert.equal(config.provider, 'gemini');
  assert.equal(config.model, 'project-gemini');
  assert.equal(config.baseUrl, 'https://generativelanguage.googleapis.com/v1beta/openai');
  const switched = loadConfiguration({ provider: 'groq' }, env, root, profile);
  assert.equal(switched.model, 'personal-groq');
  assert.equal(switched.baseUrl, 'https://api.groq.com/openai/v1');
  write(root, '.env', 'ARES_PROVIDER=cohere\n');
  assert.equal(loadConfiguration({}, env, root, profile).model, 'personal-cohere');
  assert.equal(
    loadConfiguration({}, { ...env, ARES_MODEL: 'environment-model' }, root, profile).model,
    'environment-model',
  );
  assert.equal(
    loadConfiguration(
      { model: 'explicit' },
      { ...env, ARES_MODEL: 'environment-model' },
      root,
      profile,
    ).model,
    'explicit',
  );
});

test('CLI aliases retain real HTTP conversation context after relocation and reject recycled paths', async (t) => {
  const home = temporary(t),
    parent = temporary(t),
    root = path.join(parent, 'original project'),
    moved = path.join(parent, 'moved project');
  fs.mkdirSync(root);
  write(root, 'value.js', "export const value = 'MARKER_BEFORE';\n");
  const requests = await fixtureServer(t, home);
  const registered = invoke(home, ['projects', 'add', 'alpha', root]);
  invoke(home, [
    'projects',
    'configure',
    'alpha',
    '--provider',
    'compatible',
    '--model',
    'project-model',
  ]);
  const first = await runAsync(['--project', '@alpha', 'ask', 'Inspect project', '--json'], home);
  assert.equal(first.status, 0, first.stderr);
  const session = JSON.parse(first.stdout);
  assert.equal(session.projectId, registered.project.id);
  assert.equal(requests[0].model, 'project-model');
  const changes = write(
    home,
    'change.json',
    JSON.stringify({
      summary: 'fixture',
      changes: [{ path: 'value.js', content: "export const value = 'PROPOSED';\n" }],
    }),
  );
  const proposal = invoke(home, ['--project', '@alpha', 'propose', '--from', changes]);
  moveFixture(root, moved, parent);
  write(moved, 'value.js', "export const value = 'MARKER_AFTER';\n");
  const relocated = invoke(home, ['projects', 'relocate', 'alpha', moved]);
  assert.equal(relocated.id, registered.project.id);
  const next = await runAsync(
    ['--project', '@alpha', 'ask', 'Continue', '--session', session.id, '--json'],
    home,
  );
  assert.equal(next.status, 0, next.stderr);
  assert.equal(JSON.parse(next.stdout).revision, 2);
  assert.match(requests[1].messages.at(-1).content, /MARKER_AFTER/);
  assert.doesNotMatch(requests[1].messages.at(-1).content, /MARKER_BEFORE/);
  assert.equal(requests[1].messages.length, 4);
  assert.notEqual(run(['--project', '@alpha', 'apply', proposal.id, '--json'], home).status, 0);
  fs.mkdirSync(root);
  write(root, 'value.js', 'REUSED_PATH_OTHER_PROJECT');
  invoke(home, ['projects', 'add', 'beta', root]);
  const wrong = await runAsync(
    ['--project', '@beta', 'ask', 'Wrong project', '--session', session.id, '--json'],
    home,
  );
  assert.notEqual(wrong.status, 0);
  assert.match(wrong.stderr, /otro proyecto/);
  assert.equal(requests.length, 2);
  assert.equal(invoke(home, ['--project', '@alpha', 'doctor']).project, moved);
});

test('CLI detects a replaced directory and rebinds only after explicit relocation', (t) => {
  const home = temporary(t),
    parent = temporary(t),
    root = path.join(parent, 'original'),
    moved = path.join(parent, 'moved');
  fs.mkdirSync(root);
  invoke(home, ['projects', 'add', 'alpha', root]);
  moveFixture(root, moved, parent);
  fs.mkdirSync(root);
  assert.notEqual(run(['--project', '@alpha', 'doctor', '--json'], home).status, 0);
  invoke(home, ['projects', 'relocate', 'alpha', moved]);
  assert.equal(invoke(home, ['--project', '@alpha', 'doctor']).project, moved);
  const other = path.join(parent, 'other');
  fs.mkdirSync(other);
  assert.notEqual(run(['projects', 'relocate', 'alpha', other, '--json'], home).status, 0);
  assert.equal(invoke(home, ['projects', 'show', 'alpha']).root, moved);
});

test('REPL manages aliases and profile changes without manual dotenv edits', async (t) => {
  const home = temporary(t),
    root = temporary(t);
  write(root, 'value.js', 'PROJECT_CONTEXT');
  const requests = await fixtureServer(t, home);
  const result = await runAsync(['repl'], home, {
    input:
      [
        `/projects add alpha "${root}"`,
        '/open @alpha',
        '/projects configure alpha --provider compatible --model project-choice',
        'Inspect',
        '/close',
        'Unbound query',
        'exit',
      ].join('\n') + '\n',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    requests.map((request) => request.model),
    ['project-choice', 'home-model'],
  );
  assert.match(requests[0].messages.at(-1).content, /PROJECT_CONTEXT/);
  assert.doesNotMatch(requests[1].messages.at(-1).content, /PROJECT_CONTEXT/);
  invoke(home, ['projects', 'configure', 'alpha', '--reset']);
  assert.equal(invoke(home, ['projects', 'show', 'alpha']).preferences, undefined);
});

test('project selection pins a relative private home to the launch directory', (t) => {
  const outside = temporary(t),
    project = temporary(t),
    home = temporary(t);
  const result = invoke(home, ['--project', project, 'doctor'], {
    cwd: outside,
    env: { ARES_HOME: 'private data' },
  });
  assert.equal(result.home, path.join(outside, 'private data'));
  assert(fs.existsSync(path.join(outside, 'private data', 'ares.sqlite')));
  assert(!fs.existsSync(path.join(project, 'private data')));
});
