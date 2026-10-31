import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadConfiguration,
  updateConfiguration,
  publicConfiguration,
} from '../dist/infrastructure/configuration.js';
import { PROVIDERS, providerNames } from '../dist/infrastructure/providers.js';
import { listModels } from '../dist/infrastructure/model-catalog.js';
import { CompatibleLanguageModel } from '../dist/infrastructure/language-model.js';
import { SecretSafeModel } from '../dist/infrastructure/secret-safe-model.js';
import { complete } from '../dist/shared/application/ports.js';
import { temporary, write, run, runAsync } from './helpers.mjs';

function profiles(t) {
  const home = temporary(t),
    cwd = temporary(t);
  const native = providerNames.filter((name) => !['compatible', 'ollama'].includes(name));
  write(
    home,
    '.env',
    'ARES_PROVIDER=openrouter\nARES_MODEL=legacy-model\n' +
      native
        .map(
          (name) =>
            `${PROVIDERS[name].key}=private-fixture-${name}\n${PROVIDERS[name].model}=${name}-model\n`,
        )
        .join(''),
  );
  return { home, cwd, env: { ARES_HOME: home } };
}

test('each provider gets its own endpoint, key and model; listing never exposes credentials', (t) => {
  const { home, cwd, env } = profiles(t);
  for (const provider of providerNames.filter((name) => !['compatible', 'ollama'].includes(name))) {
    const c = loadConfiguration({ provider }, env, cwd);
    assert.equal(c.baseUrl, PROVIDERS[provider].baseUrl);
    assert.equal(c.apiKey, 'private-fixture-' + provider);
    assert.equal(c.model, provider + '-model');
    assert.ok(!JSON.stringify(publicConfiguration(c)).includes('private-fixture'));
  }
  const output = run(['providers', '--json'], home);
  assert.equal(output.status, 0, output.stderr);
  const rows = JSON.parse(output.stdout);
  assert.equal(rows.filter((row) => row.credentialConfigured).length, 5);
  assert.ok(!output.stdout.includes('private-fixture'));
  const selected = loadConfiguration(
    { provider: 'groq' },
    {
      ...env,
      ARES_PROVIDER: 'compatible',
      ARES_BASE_URL: 'https://custom.example/v1',
    },
    cwd,
  );
  assert.equal(selected.baseUrl, PROVIDERS.groq.baseUrl);
});

test('profile models preserve precedence and legacy model settings survive provider switches', (t) => {
  const { home, cwd, env } = profiles(t);
  write(cwd, '.env', 'OPENROUTER_MODEL=project-model\n');
  assert.equal(loadConfiguration({}, env, cwd).model, 'project-model');
  assert.equal(
    loadConfiguration({}, { ...env, ARES_MODEL: 'process-model' }, cwd).model,
    'process-model',
  );
  assert.equal(
    loadConfiguration({ provider: 'gemini' }, { ...env, ARES_MODEL: 'process-model' }, cwd).model,
    'gemini-model',
  );
  write(home, '.env', 'ARES_PROVIDER=openrouter\nARES_MODEL=legacy-routing-model\n');
  updateConfiguration({ provider: 'groq', model: 'saved-groq' }, env, cwd);
  assert.equal(
    updateConfiguration({ provider: 'openrouter' }, env, cwd).model,
    'legacy-routing-model',
  );
  assert.equal(updateConfiguration({ provider: 'groq' }, env, cwd).model, 'saved-groq');
});

test('all native transports send only their own key to the pinned provider endpoint', async (t) => {
  const { cwd, env } = profiles(t);
  for (const provider of providerNames.filter((name) => !['compatible', 'ollama'].includes(name))) {
    const c = loadConfiguration({ provider }, env, cwd);
    let seen;
    const model = new CompatibleLanguageModel(c, async (url, init) => {
      seen = { url, init };
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }] }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    });
    assert.equal(await complete(model, [{ role: 'user', content: 'test' }]), 'OK');
    assert.equal(seen.url, PROVIDERS[provider].baseUrl + '/chat/completions');
    assert.equal(seen.init.headers.Authorization, 'Bearer private-fixture-' + provider);
    assert.equal(seen.init.redirect, 'error');
  }
});

test('Cohere catalogue uses native pagination and prevents repeated tokens; Gemini IDs are usable', async (t) => {
  const { cwd, env } = profiles(t);
  const cohere = loadConfiguration({ provider: 'cohere' }, env, cwd);
  const urls = [];
  const request = async (url, init) => {
    urls.push(url);
    assert.equal(new URL(url).host, 'api.cohere.ai');
    assert.equal(init.headers.Authorization, 'Bearer private-fixture-cohere');
    return new Response(
      JSON.stringify(
        urls.length === 1
          ? {
              models: [{ name: 'command-fixture' }, { name: 'old', is_deprecated: true }],
              next_page_token: 'page token',
            }
          : { models: [{ name: 'command-next' }] },
      ),
    );
  };
  assert.deepEqual(
    (await listModels(cohere, undefined, request)).map((m) => m.id),
    ['command-fixture', 'command-next'],
  );
  assert.equal(new URL(urls[1]).searchParams.get('page_token'), 'page token');
  await assert.rejects(
    listModels(
      cohere,
      undefined,
      async () => new Response(JSON.stringify({ models: [], next_page_token: 'same' })),
    ),
    /paginación/,
  );
  const gemini = loadConfiguration({ provider: 'gemini' }, env, cwd);
  const models = await listModels(
    gemini,
    undefined,
    async () => new Response(JSON.stringify({ data: [{ id: 'models/gemini-fixture' }] })),
  );
  assert.equal(models[0].id, 'gemini-fixture');
});

test('redaction protects every saved provider credential, including prefix-overlapping keys and split chunks', async () => {
  const secrets = ['private-fixture-key', 'private-fixture-key-longer', 'other-provider-secret'];
  const source = secrets.join(' | ');
  for (let split = 0; split <= source.length; split++) {
    let received;
    const inner = {
      name: 'fixture',
      async *stream(messages) {
        received = messages;
        yield source.slice(0, split);
        yield source.slice(split);
      },
    };
    const output = await complete(new SecretSafeModel(inner, secrets), [
      { role: 'user', content: source },
    ]);
    assert.equal(output, '[REDACTED] | [REDACTED] | [REDACTED]');
    assert.ok(!JSON.stringify(received).includes('private-fixture'));
    assert.ok(!JSON.stringify(received).includes('other-provider'));
  }
});

test('REPL provider selection changes the active model and survives clear without sending a chat', async (t) => {
  const { home } = profiles(t);
  const result = await runAsync(['repl'], home, {
    input: '/provider groq\n/model custom-groq\ncls\n/doctor\n/provider gemini\n/doctor\n/exit\n',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('Proveedor: groq'));
  assert.ok(result.stdout.includes('Modelo: custom-groq'));
  assert.ok(result.stdout.includes('Proveedor: gemini'));
  assert.ok(result.stdout.includes('Modelo: gemini-model'));
  assert.ok(!result.stdout.includes('private-fixture'));
  assert.equal(JSON.parse(run(['sessions', 'list', '--json'], home).stdout).length, 0);
});
