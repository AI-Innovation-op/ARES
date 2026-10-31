import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { temporary, write, run, runAsync, identity } from './helpers.mjs';
import { Ask } from '../dist/conversation/application/ask.js';
import { SqliteStore } from '../dist/infrastructure/sqlite-store.js';

test('project selection validates directories, uses canonical paths and leaves the invoking cwd unchanged', (t) => {
  const home = temporary(t),
    outside = temporary(t);
  const project = path.join(temporary(t), 'project with spaces');
  fs.mkdirSync(project);
  const current = process.cwd();
  const doctor = run(['--project', project, 'doctor', '--json'], home, { cwd: outside });
  assert.equal(doctor.status, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).project, fs.realpathSync(project));
  assert.equal(process.cwd(), current);
  const file = write(project, 'source.js', 'export {};');
  assert.equal(run(['--project', file, 'doctor', '--json'], home).status, 2);
  assert.equal(
    run(['--project', path.join(project, 'missing'), 'doctor', '--json'], home).status,
    1,
  );
});

test('project selection targets proposal, apply and real verification rather than the launch directory', (t) => {
  const home = temporary(t),
    outside = temporary(t),
    project = temporary(t);
  write(outside, 'src/value.js', 'outside untouched');
  write(project, 'src/value.js', 'export const value = 1;\n');
  write(
    project,
    'package.json',
    JSON.stringify({
      type: 'module',
      scripts: {
        test: `node -e "import('./src/value.js').then(m=>{if(m.value!==2)process.exitCode=1})"`,
      },
    }),
  );
  const json = write(
    home,
    'change.json',
    JSON.stringify({
      summary: 'Change fixture',
      changes: [{ path: 'src/value.js', content: 'export const value = 2;\n' }],
    }),
  );
  const invoke = (args) => {
    const result = run(['--project', project, ...args, '--json'], home, { cwd: outside });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const proposal = invoke(['propose', '--from', json]);
  assert.equal(proposal.root, fs.realpathSync(project));
  const rejectOtherProject = (command) => {
    const result = run(['--project', outside, command, proposal.id, '--json'], home, {
      cwd: outside,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /otro proyecto/);
  };
  rejectOtherProject('apply');
  assert.equal(
    fs.readFileSync(path.join(project, 'src/value.js'), 'utf8'),
    'export const value = 1;\n',
  );
  invoke(['apply', proposal.id]);
  rejectOtherProject('restore');
  rejectOtherProject('verify');
  assert.equal(
    fs.readFileSync(path.join(project, 'src/value.js'), 'utf8'),
    'export const value = 2;\n',
  );
  assert.equal(invoke(['verify', proposal.id]).status, 'passed');
  invoke(['restore', proposal.id]);
  assert.equal(
    fs.readFileSync(path.join(project, 'src/value.js'), 'utf8'),
    'export const value = 1;\n',
  );
  assert.equal(fs.readFileSync(path.join(outside, 'src/value.js'), 'utf8'), 'outside untouched');
});

test('project-bound sessions survive SQLite and reject another project before contacting a model', async (t) => {
  const home = temporary(t),
    first = temporary(t),
    second = temporary(t);
  let store = new SqliteStore(home),
    calls = 0;
  const model = {
    name: 'fixture',
    async *stream() {
      calls++;
      yield 'response';
    },
  };
  const session = await new Ask(store.conversations, model, identity).execute({
    prompt: 'First',
    project: first,
  });
  store.close();
  store = new SqliteStore(home);
  t.after(() => store.close());
  await assert.rejects(
    new Ask(store.conversations, model, identity).execute({
      prompt: 'Wrong project',
      project: second,
      sessionId: session.id,
    }),
    /otro proyecto/,
  );
  assert.equal(calls, 1);
  const next = await new Ask(store.conversations, model, identity).execute({
    prompt: 'Next',
    project: first,
    sessionId: session.id,
  });
  assert.equal(next.project, first);
  assert.equal(next.revision, 2);
});

async function serverFor(t) {
  const received = [];
  const server = http.createServer(async (req, res) => {
    let text = '';
    for await (const chunk of req) text += chunk;
    received.push(JSON.parse(text));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        choices: [{ message: { content: 'Fixture reply' }, finish_reason: 'stop' }],
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
  return {
    received,
    env: {
      ARES_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`,
      ARES_PROVIDER: undefined,
      ARES_MODEL: undefined,
    },
  };
}

test('project context is included in a real HTTP request and wrong-project resume sends nothing', async (t) => {
  const { received, env } = await serverFor(t);
  const home = temporary(t),
    outside = temporary(t),
    project = temporary(t),
    other = temporary(t);
  write(home, '.env', 'ARES_PROVIDER=compatible\nARES_MODEL=fixture\n');
  write(project, 'src/domain/value.js', 'export const MARKER_A = 1;');
  write(other, 'src/domain/value.js', 'export const MARKER_B = 2;');
  const first = await runAsync(['--project', project, 'ask', 'Inspect', '--json'], home, {
    cwd: outside,
    env,
  });
  assert.equal(first.status, 0, first.stderr);
  assert.ok(JSON.stringify(received[0]).includes('MARKER_A'));
  assert.ok(!JSON.stringify(received[0]).includes('MARKER_B'));
  const data = JSON.parse(first.stdout);
  const wrong = await runAsync(
    ['--project', other, 'ask', 'Next', '--session', data.id, '--json'],
    home,
    { env },
  );
  assert.equal(wrong.status, 1);
  assert.equal(JSON.parse(wrong.stderr).error.code, 'CONFLICT');
  assert.equal(received.length, 1);
});

test('opening and closing projects changes context and starts separate sessions; failed open preserves scope', async (t) => {
  const { received, env } = await serverFor(t);
  const home = temporary(t),
    outside = temporary(t),
    first = temporary(t),
    second = temporary(t),
    bad = temporary(t);
  write(home, '.env', 'ARES_PROVIDER=compatible\nARES_MODEL=base-model\n');
  write(first, '.env', 'ARES_MODEL=alpha-model\n');
  write(second, '.env', 'ARES_MODEL=beta-model\n');
  write(bad, '.env', 'ARES_PROVIDER=unknown\n');
  write(first, 'src/a.js', 'export const MARKER_A = 1;');
  write(second, 'src/b.js', 'export const MARKER_B = 2;');
  const input = `/open "${first}"\nFirst\n/open "${bad}"\nSecond\n/open "${second}"\ncls\nThird\n/close\nFourth\n/exit\n`;
  const result = await runAsync(['repl'], home, { cwd: outside, env, input });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    received.map((r) => r.model),
    ['alpha-model', 'alpha-model', 'beta-model', 'base-model'],
  );
  assert.ok(JSON.stringify(received[1]).includes('MARKER_A'));
  assert.ok(JSON.stringify(received[2]).includes('MARKER_B'));
  assert.ok(!JSON.stringify(received[2]).includes('MARKER_A'));
  assert.ok(!JSON.stringify(received[3]).includes('MARKER_B'));
  assert.equal(received[2].messages.filter((m) => m.role === 'assistant').length, 0);
  const sessions = JSON.parse(run(['sessions', 'list', '--json'], home).stdout);
  assert.equal(sessions.length, 3);
  assert.equal(sessions.find((s) => s.project === fs.realpathSync(first)).revision, 2);
});
