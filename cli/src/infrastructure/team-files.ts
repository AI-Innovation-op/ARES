import fs from 'node:fs';
import path from 'node:path';
import { TeamPolicy } from '../collaboration/domain/team-policy.js';
import { ChangeBundle } from '../collaboration/domain/change-bundle.js';
import { AresError } from '../shared/domain/errors.js';
import { providerDefinition, redactCredentials } from './providers.js';
import { redact } from './text.js';
import { safeTarget } from './workspace.js';

export function assertShareable(text: string, secrets: readonly string[] = []): void {
  if (redactCredentials(redact(text), secrets) !== text)
    throw new AresError(
      'VALIDATION',
      'El archivo contiene un posible secreto. Revísalo antes de compartir; no se modificó su contenido.',
    );
}
function readJson(file: string, maxBytes: number): unknown {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > maxBytes)
    throw new AresError('VALIDATION', 'Se requiere un archivo de texto acotado, sin enlaces.');
  const fd = fs.openSync(file, 'r');
  let bytes: Buffer;
  try {
    const buffer = Buffer.alloc(maxBytes + 1);
    let count = 0,
      part = 0;
    do {
      part = fs.readSync(fd, buffer, count, buffer.length - count, null);
      count += part;
    } while (part && count < buffer.length);
    if (count > maxBytes)
      throw new AresError('VALIDATION', 'El archivo excede el tamaño permitido.');
    bytes = buffer.subarray(0, count);
  } finally {
    fs.closeSync(fd);
  }
  const text = bytes.toString('utf8');
  if (!Buffer.from(text).equals(bytes) || text.includes('\0'))
    throw new AresError('VALIDATION', 'Se requiere UTF-8 válido.');
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new AresError('VALIDATION', 'JSON inválido; no se mostró su contenido.');
  }
}
export function loadTeamPolicy(
  root: string,
  secrets: readonly string[] = [],
): TeamPolicy | undefined {
  const target = path.join(root, 'ares.team.json');
  if (!fs.existsSync(target)) return undefined;
  const input = readJson(safeTarget(fs.realpathSync(root), 'ares.team.json'), 16_000);
  assertShareable(JSON.stringify(input), secrets);
  const policy = new TeamPolicy(input);
  assertShareable(JSON.stringify(policy.data), secrets);
  if (policy.data.ai) providerDefinition(policy.data.ai.provider);
  return policy;
}
export function loadChangeBundle(file: string, secrets: readonly string[]): ChangeBundle {
  const input = readJson(path.resolve(file), 4_000_000);
  assertShareable(JSON.stringify(input), secrets);
  const bundle = new ChangeBundle(input);
  assertShareable(JSON.stringify(bundle.data), secrets);
  return bundle;
}
