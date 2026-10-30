#!/usr/bin/env node
import { CommanderError } from 'commander';
import { AresError } from './shared/domain/errors.js';
import { redact, terminalText } from './infrastructure/text.js';

if (Number(process.versions.node.split('.')[0]) < 24) {
  process.stderr.write('ARES requiere Node.js 24 o superior.\n');
  process.exitCode = 2;
} else {
  try {
    const { run } = await import('./presentation/program.js');
    await run();
  } catch (error) {
    if (error instanceof CommanderError && error.exitCode === 0) {
      process.exitCode = 0;
    } else {
      const code = error instanceof AresError ? error.code : error instanceof CommanderError ? 'VALIDATION' : 'IO';
      const message = terminalText(redact(error instanceof Error ? error.message : 'Error inesperado.'));
      if (process.argv.includes('--json')) process.stderr.write(JSON.stringify({ error: { code, message } }) + '\n');
      else process.stderr.write(`ARES [${code}]: ${message}\n`);
      process.exitCode = code === 'CANCELLED' ? 130 : code === 'VALIDATION' || code === 'CONFIG' ? 2 : 1;
    }
  }
}
