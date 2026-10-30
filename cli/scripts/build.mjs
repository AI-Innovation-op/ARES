import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cliRoot = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(cliRoot, 'dist');
if (path.dirname(output) !== path.resolve(cliRoot) || path.basename(output) !== 'dist')
  throw new Error('Destino de build inválido.');
fs.rmSync(output, { recursive: true, force: true });
const result = spawnSync(
  process.execPath,
  [path.join(cliRoot, 'node_modules/typescript/bin/tsc'), '-p', cliRoot],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
