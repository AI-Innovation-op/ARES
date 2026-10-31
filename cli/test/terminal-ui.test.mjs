import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripVTControlCharacters } from 'node:util';
import { TerminalUi } from '../dist/presentation/terminal-ui.js';
import { temporary, run } from './helpers.mjs';

const profile =
  (columns = 80, colors = false) =>
  () => ({
    interactive: true,
    columns,
    colors,
    controls: true,
  });

test('terminal metadata cannot inject clipboard or cursor commands; JSON stays undecorated', (t) => {
  const ui = new TerminalUi('5.3.0\x1b]52;c;clipboard\x07', profile(80, true));
  const output =
    ui.banner({
      provider: 'compatible',
      model: 'fixture\x1b[2Jmodel\x1b]0;fake title\x07',
    }) + ui.prompt('session\x1b[2J');
  assert.ok(output.includes('\x1b[96m'));
  assert.ok(!output.includes('\x1b]'));
  assert.ok(!output.includes('\x1b[2J'));
  assert.ok(!stripVTControlCharacters(output).includes('fake title'));
  const result = run(['doctor', '--json'], temporary(t));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).version, '5.3.0');
  assert.ok(!result.stdout.includes('\x1b'));
});

test('banner and command catalogue fit wide and narrow terminal columns without color dependence', () => {
  for (const columns of [32, 48, 80, 120]) {
    const ui = new TerminalUi('5.3.0', profile(columns));
    const banner = ui.banner({ provider: 'compatible', model: 'fixture-model' });
    const catalogue = ui.help();
    for (const line of (banner + catalogue).split('\n'))
      assert.ok([...line].length <= columns, `Overflow at ${columns} columns: ${line}`);
    assert.ok(banner.includes('Created by AI Innovation'));
    assert.ok((banner + catalogue).includes('5.3.0'));
    assert.ok(!banner.includes('\x1b'));
    assert.ok(ui.prompt().includes('ares@standalone:~$'));
    assert.ok(catalogue.includes('/analyze'));
  }
});
