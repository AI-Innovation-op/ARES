import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { sseData } from '../dist/infrastructure/language-model.js';
import { temporary, runAsync, run, write } from './helpers.mjs';

const frame = (value) => `data: ${JSON.stringify(value)}\r\n\r\n`;
async function fixtureServer(t, handler) {
  const server = http.createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    handler(request, response, body ? JSON.parse(body) : undefined);
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
    ARES_PROVIDER: 'compatible',
    ARES_MODEL: 'http-fixture',
    ARES_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`,
  };
}

test('SSE parser handles fragmented UTF-8, CRLF, comments, multiline frames and final unterminated frame', async () => {
  const text = ': keep-alive\r\ndata: {"text":\r\ndata: "á🛡️"}\r\n\r\ndata: [DONE]';
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i + 1));
      controller.close();
    },
  });
  const frames = [];
  for await (const value of sseData(body)) frames.push(value);
  assert.deepEqual(frames, ['{"text":\n"á🛡️"}', '[DONE]']);
});

test('SSE parser supports bare carriage-return separators split across chunks', async () => {
  const bytes = new TextEncoder().encode('data: first\r\rdata: second\r\r');
  const body = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  const result = [];
  for await (const data of sseData(body)) result.push(data);
  assert.deepEqual(result, ['first', 'second']);
});

test('catalog is fetched without selecting a model, handles duplicates and never leaks its credential', async (t) => {
  const home = temporary(t),
    seen = [];
  const env = await fixtureServer(t, (req, res) => {
    seen.push({ method: req.method, url: req.url, authorization: req.headers.authorization });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        data: [
          { id: 'b/model', name: 'Second' },
          { id: 'a/model', name: 'First', context_length: 8000 },
          { id: 'a/model', name: 'First updated' },
          { name: 'missing id' },
        ],
      }),
    );
  });
  const result = await runAsync(['models', '--filter', 'a/model', '--json'], home, {
    env: { ...env, ARES_MODEL: '', COMPATIBLE_API_KEY: 'catalog-private-fixture-key' },
  });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.total, 2);
  assert.equal(data.models.length, 1);
  assert.equal(data.models[0].id, 'a/model');
  assert.deepEqual(seen, [
    { method: 'GET', url: '/v1/models', authorization: 'Bearer catalog-private-fixture-key' },
  ]);
  assert.ok(!result.stdout.includes('catalog-private-fixture-key'));
});

test('JSON responses with filtered or unsupported finish reasons cannot be stored as completed turns', async (t) => {
  for (const reason of ['content_filter', 'tool_calls', 'error']) {
    const home = temporary(t);
    const env = await fixtureServer(t, (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({ choices: [{ message: { content: 'partial' }, finish_reason: reason }] }),
      );
    });
    const result = await runAsync(['ask', 'hello', '--json'], home, { env });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.deepEqual(JSON.parse(run(['sessions', 'list', '--json'], home).stdout), []);
  }
});

test('real HTTP transport through CLI preserves markdown and sessions across processes', async (t) => {
  const requests = [],
    home = temporary(t);
  const env = await fixtureServer(t, (req, res, body) => {
    requests.push({ url: req.url, body });
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(': heartbeat\r\n\r\n');
    res.write(frame({ choices: [{ delta: { content: 'Español 🛡️\n\n```ts\n' } }] }));
    res.write(frame({ choices: [{ delta: { content: 'const a = 1;\n```' } }] }));
    res.write(frame({ choices: [{ delta: {}, finish_reason: 'stop' }] }));
    res.end('data: [DONE]\n\n');
  });
  const first = await runAsync(['ask', 'Primera pregunta', '--json'], home, { env });
  assert.equal(first.status, 0, first.stderr);
  const data = JSON.parse(first.stdout);
  assert.equal(data.turns[0].answer, 'Español 🛡️\n\n```ts\nconst a = 1;\n```');
  const second = await runAsync(['ask', '--session', data.id, '--json'], home, {
    env,
    input: 'Segunda pregunta',
  });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(JSON.parse(second.stdout).turns.length, 2);
  assert.equal(requests[0].url, '/v1/chat/completions');
  assert.equal(requests[0].body.stream, true);
  assert.deepEqual(
    requests[1].body.messages.map((m) => m.role),
    ['system', 'user', 'assistant', 'user'],
  );
  const saved = run(['sessions', 'show', data.id, '--json'], home);
  assert.equal(JSON.parse(saved.stdout).turns.length, 2);
  const file = path.join(home, 'history.md');
  assert.equal(run(['sessions', 'export', data.id, '-o', file, '--json'], home).status, 0);
  assert.ok(fs.readFileSync(file, 'utf8').includes('Segunda pregunta'));
});

test('network failures, truncated streams and provider errors return failure without saving a turn or exposing error bodies', async (t) => {
  for (const mode of ['auth', 'cut', 'length', 'midstream', 'invalid']) {
    await t.test(mode, async (t) => {
      const home = temporary(t);
      const env = await fixtureServer(t, (_req, res) => {
        if (mode === 'auth') {
          res.writeHead(401);
          res.end('secret-provider-key-must-not-leak');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write(frame({ choices: [{ delta: { content: 'partial' } }] }));
        if (mode === 'length')
          res.write(frame({ choices: [{ delta: {}, finish_reason: 'length' }] }));
        if (mode === 'midstream')
          res.write(frame({ error: { message: 'secret-provider-key-must-not-leak' } }));
        if (mode === 'invalid') res.write('data: definitely not JSON\n\n');
        res.end();
      });
      const result = await runAsync(['ask', 'question', '--json'], home, { env });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.equal(result.stdout, '');
      assert.equal(JSON.parse(result.stderr).error.code, 'PROVIDER');
      assert.ok(!result.stderr.includes('secret-provider-key-must-not-leak'));
      assert.deepEqual(JSON.parse(run(['sessions', 'list', '--json'], home).stdout), []);
    });
  }
});

test('timeout aborts the HTTP request and leaves no session', async (t) => {
  const home = temporary(t);
  const env = await fixtureServer(t, (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(': waiting\n\n');
  });
  const result = await runAsync(['ask', 'question', '--json'], home, {
    env: { ...env, ARES_TIMEOUT_MS: '100' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /espera agotado/);
  assert.deepEqual(JSON.parse(run(['sessions', 'list', '--json'], home).stdout), []);
});

test('AI proposal passes through HTTP, domain validation, diff, apply and restore', async (t) => {
  const home = temporary(t),
    root = temporary(t);
  write(root, 'src/task.ts', 'export const status = "pending";\n');
  const env = await fixtureServer(t, (_req, res, body) => {
    assert.ok(body.messages[1].content.includes('src/task.ts'));
    const text = JSON.stringify({
      summary: 'Change status',
      changes: [{ path: 'src/task.ts', content: 'export const status = "completed";\n' }],
    });
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(frame({ choices: [{ delta: { content: text } }] }));
    res.end('data: [DONE]\n\n');
  });
  const generated = await runAsync(['propose', 'Change status', '--path', root, '--json'], home, {
    env,
  });
  assert.equal(generated.status, 0, generated.stderr);
  const p = JSON.parse(generated.stdout);
  assert.equal(
    fs.readFileSync(path.join(root, 'src/task.ts'), 'utf8'),
    'export const status = "pending";\n',
  );
  assert.equal(run(['apply', p.id, '--json'], home).status, 0);
  assert.equal(run(['restore', p.id, '--json'], home).status, 0);
  assert.equal(
    fs.readFileSync(path.join(root, 'src/task.ts'), 'utf8'),
    'export const status = "pending";\n',
  );
});

test('interactive shell consumes piped commands in order and preserves conversation state', async (t) => {
  const home = temporary(t);
  const env = await fixtureServer(t, (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end(frame({ choices: [{ delta: { content: 'Respuesta' } }] }) + 'data: [DONE]\n\n');
  });
  const result = await runAsync(['repl'], home, {
    env,
    input: '/help\nPrimera\nSegunda\n/history\n/exit\n',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('Primera'));
  assert.ok(result.stdout.includes('Segunda'));
  assert.equal(JSON.parse(run(['sessions', 'list', '--json'], home).stdout)[0].revision, 2);
});

test('configured credentials echoed across HTTP chunks never enter stdout, stored turns or the search index', async (t) => {
  const home = temporary(t),
    secret = 'private-fixture-transport-key';
  let received;
  const env = await fixtureServer(t, (_req, res, body) => {
    received = body;
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(frame({ choices: [{ delta: { content: 'Echo ' + secret.slice(0, 10) } }] }));
    res.end(frame({ choices: [{ delta: { content: secret.slice(10) } }] }) + 'data: [DONE]\n\n');
  });
  const result = await runAsync(['ask', 'Question ' + secret, '--json'], home, {
    env: { ...env, COMPATIBLE_API_KEY: secret },
  });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.ok(!result.stdout.includes(secret));
  assert.ok(!JSON.stringify(received).includes(secret));
  assert.equal(data.turns[0].answer, 'Echo [REDACTED]');
  const read = run(['sessions', 'show', data.id.slice(0, 8), '--json'], home);
  assert.ok(!read.stdout.includes(secret));
  assert.ok(read.stdout.includes('[REDACTED]'));
  assert.deepEqual(JSON.parse(run(['sessions', 'search', secret, '--json'], home).stdout), []);
});

test('interactive shell runs local commands with quoted paths and changes the model for later turns', async (t) => {
  const home = temporary(t),
    root = temporary(t),
    project = path.join(root, 'project with spaces'),
    requests = [];
  write(project, 'file.ts', 'const a = 1;');
  const env = await fixtureServer(t, (_req, res, body) => {
    requests.push(body);
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end(frame({ choices: [{ delta: { content: 'Response' } }] }) + 'data: [DONE]\n\n');
  });
  const input = `/audit "${project}" --json\n/model selected-model\n/context "${project}"\nReview file\n/audit --help\n/exit\n`;
  const result = await runAsync(['repl'], home, { env, input });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /dynamic-eval|"files":1/);
  assert.equal(requests[0].model, 'selected-model');
  assert.ok(requests[0].messages[1].content.includes('file.ts'));
  assert.ok(!result.stderr.includes('outputHelp'));
});
