import { test } from 'node:test';
import assert from 'node:assert/strict';
import { temporary, run } from './helpers.mjs';

test('setup and secret automation reject noninteractive or malformed input without printing it', (t) => {
  const home = temporary(t);
  assert.equal(run(['setup'], home, { input: 'not-a-terminal' }).status, 2);
  const result = run(
    ['config', 'set', '--provider', 'openrouter', '--model', 'fixture', '--key-stdin', '--json'],
    home,
    { input: 'private-fixture-line1\nprivate-fixture-line2' },
  );
  assert.equal(result.status, 2);
  assert.ok(!result.stderr.includes('private-fixture'));
  assert.equal(result.stdout, '');
});
