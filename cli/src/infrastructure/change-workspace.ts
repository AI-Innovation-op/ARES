import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ChangeWorkspace } from '../changes/application/change-code.js';
import { hash, readCurrent, replaceFile } from './workspace.js';
import { AresError } from '../shared/domain/errors.js';

export class LocalChangeWorkspace implements ChangeWorkspace {
  constructor(private readonly home: string) {}
  read(root: string, relative: string) {
    const content = readCurrent(root, relative);
    return content === null ? null : { content, hash: hash(content) };
  }
  replace(root: string, relative: string, content: string | null): void { replaceFile(root, relative, content); }

  withLock<T>(root: string, action: () => T): T {
    const directory = path.join(this.home, 'locks');
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const lock = path.join(directory, hash(process.platform === 'win32' ? root.toLowerCase() : root) + '.json');
    const owner = randomUUID();
    const acquire = () => fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, owner }), { flag: 'wx', mode: 0o600 });
    try { acquire(); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      let stale = false;
      try {
        const existing = JSON.parse(fs.readFileSync(lock, 'utf8')) as { pid: number };
        if (Number.isInteger(existing.pid) && existing.pid > 0) {
          try { process.kill(existing.pid, 0); } catch (e) { stale = (e as NodeJS.ErrnoException).code === 'ESRCH'; }
        }
      } catch { /* Unknown locks are kept for manual inspection. */ }
      if (!stale) throw new AresError('CONFLICT', `Hay otra operación sobre este proyecto. Revisa ${lock}.`);
      fs.unlinkSync(lock); acquire();
    }
    try { return action(); } finally {
      const current = JSON.parse(fs.readFileSync(lock, 'utf8')) as { owner: string };
      if (current.owner === owner) fs.unlinkSync(lock);
    }
  }
}
