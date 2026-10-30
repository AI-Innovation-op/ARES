import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfiguration, updateConfiguration } from '../dist/infrastructure/configuration.js';
import { SecretSafeModel } from '../dist/infrastructure/secret-safe-model.js';
import { temporary, write, run } from './helpers.mjs';

test('config set accepts a secret only through stdin, keeps unrelated text and never prints its value', (t) => {
  const home = temporary(t),
    file = write(
      home,
      '.env',
      '# comment\nCUSTOM_PATH=\'C:\\my folder\'\nMULTILINE="line1\nline2"\nARES_PROVIDER=openrouter\n',
    );
  const value = 'private-fixture-key-do-not-echo';
  const result = run(
    ['config', 'set', '--provider', 'gemini', '--model', 'fixture-model', '--key-stdin', '--json'],
    home,
    { input: value + '\n' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.stdout.includes(value));
  assert.ok(!result.stderr.includes(value));
  assert.equal(JSON.parse(result.stdout).credentialConfigured, true);
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('# comment'));
  assert.ok(content.includes("CUSTOM_PATH='C:\\my folder'"));
  assert.ok(content.includes('MULTILINE="line1\nline2"'));
  const config = loadConfiguration({}, { ARES_HOME: home }, temporary(t));
  assert.equal(config.apiKey, value);
  assert.equal(config.model, 'fixture-model');
});

test('switching providers removes a custom endpoint and a generic credential alias without mixing provider keys', (t) => {
  const home = temporary(t),
    cwd = temporary(t);
  write(
    home,
    '.env',
    'ARES_PROVIDER=compatible\nARES_BASE_URL=http://127.0.0.1:9090/v1\nARES_API_KEY_DIRECT=old-fixture-credential\n',
  );
  const config = updateConfiguration(
    { provider: 'gemini', model: 'model', apiKey: 'new-gemini-fixture-key' },
    { ARES_HOME: home },
    cwd,
  );
  assert.equal(config.provider, 'gemini');
  assert.equal(config.baseUrl, 'https://generativelanguage.googleapis.com/v1beta/openai');
  assert.equal(config.apiKey, 'new-gemini-fixture-key');
  const content = fs.readFileSync(path.join(home, '.env'), 'utf8');
  assert.ok(!content.includes('ARES_API_KEY_DIRECT'));
  assert.ok(!content.includes('9090'));
});

test('invalid configuration cannot overwrite a working private file', (t) => {
  const home = temporary(t),
    cwd = temporary(t),
    file = write(
      home,
      '.env',
      'ARES_PROVIDER=openrouter\nARES_MODEL=original\nOPENROUTER_API_KEY=existing-fixture-key\n',
    );
  const before = fs.readFileSync(file, 'utf8');
  for (const update of [
    { provider: 'unknown' },
    { provider: 'compatible', baseUrl: 'http://remote.example/v1' },
    { model: 'line\nbreak' },
    { apiKey: 'short' },
    { apiKey: 'spaces are invalid' },
  ]) {
    assert.throws(() => updateConfiguration(update, { ARES_HOME: home }, cwd));
    assert.equal(fs.readFileSync(file, 'utf8'), before);
  }
  assert.deepEqual(
    fs.readdirSync(home).filter((name) => name.endsWith('.tmp')),
    [],
  );
  assert.equal(run(['setup', '--json'], home).status, 2);
});

test('generic key aliases cannot redirect a personal credential to a custom provider endpoint', (t) => {
  const home = temporary(t),
    cwd = temporary(t);
  assert.throws(
    () =>
      loadConfiguration(
        {},
        {
          ARES_HOME: home,
          ARES_PROVIDER: 'compatible',
          ARES_BASE_URL: 'https://other.example/v1',
          ARES_API_KEY_DIRECT: 'private-fixture',
        },
        cwd,
      ),
    /alias genérico/,
  );
});

test('known credentials are redacted across every stream split before output or persistence', async () => {
  const secret = 'credential-ABC123-XYZ';
  for (let split = 0; split <= secret.length; split++) {
    let received;
    const inner = {
      name: 'fixture',
      async *stream(messages) {
        received = messages;
        yield 'before ' + secret.slice(0, split);
        yield secret.slice(split) + ' after';
      },
    };
    const model = new SecretSafeModel(inner, secret);
    let result = '';
    for await (const chunk of model.stream([{ role: 'user', content: `Check ${secret}` }]))
      result += chunk;
    assert.equal(result, 'before [REDACTED] after');
    assert.equal(received[0].content, 'Check [REDACTED]');
  }
});
