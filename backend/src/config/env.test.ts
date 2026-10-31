import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function configuration(cors: string, mode = 'production') {
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      `await import(${JSON.stringify(new URL('./env.ts', import.meta.url).href)})`,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: mode,
        CORS_ORIGIN: cors,
        DOTENV_CONFIG_PATH: '.env-test-no-file',
        DOTENV_CONFIG_QUIET: 'true',
      },
    },
  );
}
test('production accepts the two public ARES web origins', () => {
  assert.equal(
    configuration('https://ares-frontend-y8e6.onrender.com, https://ai-innovation-op.github.io')
      .status,
    0,
  );
});
for (const origin of [
  '*',
  'https://example.com, *',
  '',
  'https://example.com/path',
  'https://user:pass@example.com',
  'file:///tmp/site',
]) {
  test(`production rejects an invalid CORS origin: ${origin || '(empty)'}`, () => {
    const result = configuration(origin);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /CORS_ORIGIN/);
  });
}
test('development still supports a wildcard for local use', () =>
  assert.equal(configuration('*', 'development').status, 0));
