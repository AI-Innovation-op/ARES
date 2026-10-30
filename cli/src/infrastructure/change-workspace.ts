import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ChangeWorkspace } from '../changes/application/change-code.js';
import { hash, readCurrent, replaceFile } from './workspace.js';
import { AresError } from '../shared/domain/errors.js';
import { openDatabase } from './native-sqlite.js';

export class LocalChangeWorkspace implements ChangeWorkspace {
  read(root: string, relative: string) {
    const content = readCurrent(root, relative);
    return content === null ? null : { content, hash: hash(content) };
  }
  replace(root: string, relative: string, content: string | null): void {
    replaceFile(root, relative, content);
  }

  withLock<T>(root: string, action: () => T): T {
    const directory = path.join(os.tmpdir(), 'ares-cli-locks-' + hash(os.homedir()).slice(0, 16));
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const lock = path.join(
      directory,
      hash(process.platform === 'win32' ? root.toLowerCase() : root) + '.sqlite',
    );
    const db = openDatabase(lock, { timeout: 1500 });
    try {
      try {
        db.exec('BEGIN IMMEDIATE');
      } catch {
        throw new AresError(
          'CONFLICT',
          'Hay otra operación sobre este proyecto; vuelve a intentarlo cuando termine.',
        );
      }
      // SQLite owns the OS lock. A killed process releases it without unsafe stale-file deletion.
      try {
        return action();
      } finally {
        db.exec('ROLLBACK');
      }
    } finally {
      db.close();
    }
  }
}
