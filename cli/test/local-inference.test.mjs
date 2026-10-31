import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { localBudget } from '../dist/inference/domain/local-budget.js';
import { OllamaEngine, OllamaLanguageModel } from '../dist/infrastructure/ollama.js';
import { MeasuredModel } from '../dist/inference/application/measure-model.js';
import { evaluateModels, EVALUATION_TASKS } from '../dist/inference/application/evaluate-models.js';
import { InferenceMetrics } from '../dist/infrastructure/inference-metrics.js';
import { loadConfiguration } from '../dist/infrastructure/configuration.js';
import { complete } from '../dist/shared/application/ports.js';
import { temporary, run, runAsync, write } from './helpers.mjs';

const gib = 1024 ** 3;
const installed = { name: 'fixture:7b', size: 4 * gib, digest: 'fixture-digest' };
const details = {
  capabilities: ['completion'],
  model_info: { 'general.architecture': 'qwen2', 'qwen2.context_length': 32768 },
};
function config(home, baseUrl = 'http://127.0.0.1:11434') {
  return loadConfiguration(
    { provider: 'ollama', model: installed.name },
    { ARES_HOME: home, ARES_PROVIDER: 'ollama', ARES_BASE_URL: baseUrl },
    home,
  );
}
function fakeRequest(mode = 'ok', seen = []) {
  return async (url, init) => {
    seen.push({ url, init });
    if (url.endsWith('/api/ps')) return Response.json({ models: [] });
    if (url.endsWith('/api/tags')) return Response.json({ models: [installed] });
    if (url.endsWith('/api/show'))
      return Response.json(mode === 'remote' ? { ...details, remote_model: 'cloud-ref' } : details);
    if (url.endsWith('/api/chat')) {
      const chunks = [
        { message: { content: '¡Listo 🦉!' }, done: false },
        ...(mode === 'cut'
          ? []
          : [
              {
                done: true,
                done_reason: mode === 'length' ? 'length' : 'stop',
                prompt_eval_count: 22,
                eval_count: 5,
                eval_duration: 1_000_000_000,
              },
            ]),
      ];
      const bytes = new TextEncoder().encode(chunks.map((row) => JSON.stringify(row)).join('\n'));
      return new Response(
        new ReadableStream({
          start(controller) {
            for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3));
            controller.close();
          },
        }),
      );
    }
    throw new Error('Unexpected URL');
  };
}

test('local budgets adapt to available memory, model capacity and explicit output limits', () => {
  const model = { name: 'test', sizeBytes: 4 * gib, maxContext: 32768, digest: 'x' };
  const resources = {
    platform: 'win32',
    architecture: 'x64',
    totalMemoryBytes: 16 * gib,
    availableMemoryBytes: 5 * gib,
  };
  assert.equal(localBudget(resources, model).contextTokens, 2048);
  assert.equal(localBudget({ ...resources, gpuFreeBytes: 8 * gib }, model).contextTokens, 4096);
  assert.equal(
    localBudget({ ...resources, gpuFreeBytes: 4 * gib }, { ...model, residentVramBytes: 4 * gib })
      .contextTokens,
    4096,
  );
  const budget = localBudget(resources, model, 8192, 32768);
  assert.equal(budget.outputTokens, 2048);
  assert.equal(budget.inputBudgetBytes, 8192 - 2048 - 256);
  assert.equal(localBudget(resources, { ...model, maxContext: 4096 }, 8192).contextTokens, 4096);
});

test('native cancellation and timeout interrupt streaming and never count a partial answer as completed', async (t) => {
  const home = temporary(t);
  for (const cancelled of [true, false]) {
    const controller = new AbortController();
    const request = async (url, init) => {
      if (!url.endsWith('/api/chat')) return fakeRequest()(url, init);
      return new Response(
        new ReadableStream({
          start(stream) {
            init.signal.addEventListener('abort', () => stream.error(init.signal.reason), {
              once: true,
            });
          },
        }),
      );
    };
    const model = await OllamaLanguageModel.connect(
      { ...config(home), timeoutMs: 100 },
      undefined,
      request,
    );
    const timer = setTimeout(() => controller.abort(), cancelled ? 20 : 1000);
    try {
      await assert.rejects(
        complete(model, [{ role: 'user', content: 'Hola' }], controller.signal),
        (error) => error.code === (cancelled ? 'CANCELLED' : 'PROVIDER'),
      );
    } finally {
      clearTimeout(timer);
    }
  }
});

test('hardware diagnosis works without a local engine and evaluation refuses existing output before API calls', (t) => {
  const home = temporary(t);
  const diagnosis = run(['local', 'hardware', '--json'], home);
  assert.equal(diagnosis.status, 0, diagnosis.stderr);
  assert.ok(JSON.parse(diagnosis.stdout).totalMemoryBytes > 0);
  const file = write(home, 'existing-report.json', 'unchanged');
  const result = run(
    [
      'evaluate',
      '--local-model',
      'absent',
      '--cloud-provider',
      'openrouter',
      '--cloud-model',
      'absent',
      '-o',
      file,
      '--json',
    ],
    home,
  );
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).error.code, 'CONFLICT');
  assert.equal(fs.readFileSync(file, 'utf8'), 'unchanged');
});

test('local mode rejects remote endpoints, cloud references, redirects and non-completion models', async (t) => {
  const home = temporary(t);
  assert.throws(() => new OllamaEngine('https://remote.example'), /loopback/);
  assert.throws(() => new OllamaEngine('http://127.0.0.1:11434/v1'), /loopback/);
  await assert.rejects(
    OllamaLanguageModel.connect(config(home), undefined, fakeRequest('remote')),
    /pesos locales/,
  );
  await assert.rejects(
    new OllamaEngine(
      undefined,
      async () =>
        new Response(null, { status: 302, headers: { location: 'https://remote.example' } }),
    ).models(),
    /HTTP 302/,
  );
  await assert.rejects(
    new OllamaEngine(undefined, async (url) =>
      Response.json(
        url.endsWith('/api/tags')
          ? { models: [installed] }
          : { ...details, capabilities: ['embedding'] },
      ),
    ).model(installed.name),
    /conversación/,
  );
  assert.throws(() => config(home, 'http://192.168.1.2:11434'), /HTTPS|loopback/);
});

test('native streaming handles fragmented UTF-8, budgets and actual usage without authorization headers', async (t) => {
  const home = temporary(t),
    seen = [];
  const model = await OllamaLanguageModel.connect(config(home), undefined, fakeRequest('ok', seen));
  const answer = await complete(model, [{ role: 'user', content: 'Hola' }]);
  assert.equal(answer, '¡Listo 🦉!');
  const request = seen.find((row) => row.url.endsWith('/api/chat'));
  assert.equal(request.init.headers.Authorization, undefined);
  assert.equal(request.init.redirect, 'error');
  assert.equal(JSON.parse(request.init.body).options.num_ctx, model.prepared.budget.contextTokens);
  assert.deepEqual(model.usage, { inputTokens: 22, outputTokens: 5, generationMs: 1000 });
  const before = seen.length;
  await assert.rejects(
    complete(model, [{ role: 'user', content: 'a'.repeat(40000) }]),
    /Entrada local demasiado grande/,
  );
  assert.equal(seen.length, before);
  for (const mode of ['cut', 'length']) {
    const truncated = await OllamaLanguageModel.connect(config(home), undefined, fakeRequest(mode));
    await assert.rejects(
      complete(truncated, [{ role: 'user', content: 'Hola' }]),
      /incompleta|truncada/,
    );
  }
});

test('measurements store metadata only and retain failed and cancelled status', async (t) => {
  const home = temporary(t),
    store = new InferenceMetrics(home);
  const model = new MeasuredModel(
    {
      name: 'fixture',
      usage: { outputTokens: 1 },
      async *stream() {
        yield 'private-source-content';
      },
    },
    (row) => store.save(row),
  );
  assert.equal(
    await complete(model, [{ role: 'user', content: 'private-prompt-content' }]),
    'private-source-content',
  );
  const broken = new MeasuredModel(
    {
      name: 'broken',
      async *stream() {
        throw new Error('private-error');
      },
    },
    (row) => store.save(row),
  );
  await assert.rejects(complete(broken, []));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(complete(broken, [], controller.signal));
  const rows = store.list(10);
  assert.deepEqual(
    rows.map((row) => row.status),
    ['cancelled', 'failed', 'completed'],
  );
  assert.ok(!JSON.stringify(rows).includes('private-'));
  assert.ok(rows.at(-1).durationMs >= 0);
  const db = fs.readFileSync(path.join(home, 'inference-metrics.db'));
  assert.ok(!db.includes(Buffer.from('private-')));
});

test('evaluation applies identical tasks to both targets and fails incorrect structured answers', async () => {
  const received = [];
  const report = await evaluateModels(
    ['local', 'cloud'].map((label) => ({
      label,
      async create() {
        return {
          name: label,
          async *stream(messages) {
            received.push({ label, messages });
            const task = EVALUATION_TASKS.find((task) => task.prompt === messages[1].content);
            yield label === 'local' ? JSON.stringify(task.expected) : '{}';
          },
        };
      },
    })),
    1,
  );
  assert.equal(report.results.length, 6);
  assert.deepEqual(
    report.summary.map((row) => row.passed),
    [3, 0],
  );
  for (let i = 0; i < received.length; i += 2)
    assert.deepEqual(received[i].messages, received[i + 1].messages);
});

test('CLI selects installed local model, preserves cloud profile and keeps partial turns unsaved', async (t) => {
  const home = temporary(t),
    requests = [];
  let mode = 'ok';
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ path: req.url, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [installed] }));
    if (req.url === '/api/show') return res.end(JSON.stringify(details));
    if (req.url === '/api/version') return res.end(JSON.stringify({ version: 'fixture' }));
    if (req.url === '/api/ps') return res.end(JSON.stringify({ models: [] }));
    if (req.url === '/api/chat')
      return res.end(
        JSON.stringify({
          message: { content: 'Respuesta local' },
          done: true,
          done_reason: mode === 'ok' ? 'stop' : 'length',
          prompt_eval_count: 30,
          eval_count: 4,
        }) + '\n',
      );
    res.statusCode = 404;
    res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}`;
  write(
    home,
    '.env',
    `ARES_PROVIDER=openrouter\nARES_MODEL=cloud-profile\nOPENROUTER_MODEL=cloud-profile\n`,
  );
  const env = { ARES_PROVIDER: 'ollama', ARES_BASE_URL: url };
  let result = await runAsync(
    ['local', 'use', installed.name, '--context', '4096', '--json'],
    home,
    { env },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    fs.readFileSync(path.join(home, '.env'), 'utf8').includes('OPENROUTER_MODEL=cloud-profile'),
  );
  result = await runAsync(['ask', 'Hola', '--json'], home, { env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).turns[0].answer, 'Respuesta local');
  mode = 'length';
  result = await runAsync(['ask', 'No guardes parcial', '--json'], home, { env });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(run(['sessions', 'list', '--json'], home).stdout).length, 1);
  const metrics = JSON.parse(run(['metrics', '--json'], home).stdout).measurements;
  assert.deepEqual(
    metrics.map((row) => row.status),
    ['failed', 'completed'],
  );
  assert.ok(!JSON.stringify(metrics).includes('Hola'));
  assert.equal(requests.filter((row) => row.path === '/api/chat').length, 2);
});
