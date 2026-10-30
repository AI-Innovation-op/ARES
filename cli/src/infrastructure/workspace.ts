import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import ignore, { type Ignore } from 'ignore';
import { SourcePath, isPrivatePath, type Snapshot, type SourceFile } from '../workspace/domain/source-path.js';
import type { WorkspaceReader } from '../workspace/application/inspect.js';
import { AresError } from '../shared/domain/errors.js';

export const hash = (text: string | Buffer): string => createHash('sha256').update(text).digest('hex');
const isMissing = (e: unknown) => (e as NodeJS.ErrnoException).code === 'ENOENT';

/** The explicit root is canonicalized once; descendants may never be links. */
export function safeTarget(root: string, relative: string): string {
  const source = new SourcePath(relative);
  const resolved = path.resolve(root);
  if (fs.realpathSync(resolved) !== resolved || fs.lstatSync(resolved).isSymbolicLink()) throw new AresError('CONFLICT', 'La raíz del proyecto cambió o es un enlace.');
  let current = resolved;
  for (const part of source.value.split('/')) {
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || stat.nlink > 1 && stat.isFile()) throw new AresError('CONFLICT', `No se permiten enlaces: ${relative}`);
      if (current !== path.join(resolved, ...source.value.split('/')) && !stat.isDirectory()) throw new AresError('CONFLICT', `Un componente no es un directorio: ${relative}`);
    } catch (e) { if (!isMissing(e)) throw e; }
  }
  return current;
}

export function readCurrent(root: string, relative: string): string | null {
  const target = safeTarget(root, relative);
  try {
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.size > 1_000_000) throw new AresError('CONFLICT', `Archivo no editable: ${relative}`);
    const bytes = fs.readFileSync(target);
    const text = bytes.toString('utf8');
    if (text.includes('\0') || !Buffer.from(text).equals(bytes)) throw new AresError('CONFLICT', `Archivo binario: ${relative}`);
    return text;
  } catch (error) { if (isMissing(error)) return null; throw error; }
}

/** Same-directory rename: a reader observes a complete old or new file. */
export function replaceFile(root: string, relative: string, content: string | null): void {
  const target = safeTarget(root, relative);
  if (content === null) { fs.unlinkSync(target); return; }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  safeTarget(root, relative);
  let mode = 0o644;
  try { mode = fs.statSync(target).mode; } catch (e) { if (!isMissing(e)) throw e; }
  const temporary = path.join(path.dirname(target), `.ares-${randomUUID()}.tmp`);
  let fd: number | undefined;
  try {
    fd = fs.openSync(temporary, 'wx', mode);
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    safeTarget(root, relative);
    fs.renameSync(temporary, target);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export class LocalWorkspace implements WorkspaceReader {
  constructor(private readonly limits = { maxFiles: 240, maxFileBytes: 128_000, maxBytes: 800_000 }) {}

  scan(target: string): Snapshot {
    if (!fs.existsSync(target)) throw new AresError('NOT_FOUND', `No existe: ${target}`);
    if (fs.lstatSync(target).isSymbolicLink()) throw new AresError('VALIDATION', 'No se inspeccionan enlaces simbólicos.');
    const canonical = fs.realpathSync(target);
    const single = fs.statSync(canonical).isFile();
    const root = single ? path.dirname(canonical) : canonical;
    if (isPrivatePath(canonical)) throw new AresError('VALIDATION', 'La ruta pertenece a una ubicación privada o excluida.');
    const files: SourceFile[] = [];
    let skipped = 0, bytes = 0, visited = 0, truncated = false;
    const addFile = (absolute: string) => {
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      try { new SourcePath(relative); } catch { skipped++; return; }
      const stat = fs.lstatSync(absolute);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1) { skipped++; return; }
      if (stat.size > this.limits.maxFileBytes) { skipped++; return; }
      if (files.length >= this.limits.maxFiles || bytes + stat.size > this.limits.maxBytes) { skipped++; truncated = true; return; }
      const buffer = fs.readFileSync(absolute);
      const content = buffer.toString('utf8');
      if (content.includes('\0') || !Buffer.from(content).equals(buffer)) { skipped++; return; }
      files.push(Object.freeze({ path: relative, content, hash: hash(buffer) })); bytes += buffer.length;
    };
    type Rules = { base: string; matcher: Ignore }[];
    const rulesAt = (directory: string, inherited: Rules): Rules => {
      const rules = [...inherited];
      for (const name of ['.gitignore', '.aresignore']) {
        const ruleFile = path.join(directory, name);
        try {
          const stat = fs.lstatSync(ruleFile);
          if (stat.isFile() && !stat.isSymbolicLink() && stat.size < 64_000) rules.push({ base: directory, matcher: ignore().add(fs.readFileSync(ruleFile, 'utf8')) });
        } catch (e) { if (!isMissing(e)) throw e; }
      }
      return rules;
    };
    const excludedBy = (absolute: string, directory: boolean, rules: Rules): boolean => {
      let excluded = false;
      for (const rule of rules) {
        const local = path.relative(rule.base, absolute).replace(/\\/g, '/') + (directory ? '/' : '');
        if (!local) continue;
        const result = rule.matcher.test(local);
        if (result.ignored) excluded = true;
        if (result.unignored) excluded = false;
      }
      return excluded;
    };
    // A subdirectory/file inside a Git worktree still inherits root ignore rules.
    const ancestors: string[] = [];
    let cursor = root;
    let repositoryFound = false;
    while (true) {
      if (fs.existsSync(path.join(cursor, '.git'))) { repositoryFound = true; break; }
      const parent = path.dirname(cursor);
      if (parent === cursor) break;
      ancestors.unshift(parent); cursor = parent;
    }
    let inheritedRules: Rules = [];
    if (repositoryFound) {
      for (const ancestor of ancestors) {
        if (ancestor === root) continue;
        inheritedRules = rulesAt(ancestor, inheritedRules);
      }
    }
    const walk = (directory: string, inherited: Rules, depth: number) => {
      if (++visited > 10_000 || depth > 30) { truncated = true; skipped++; return; }
      const rules = rulesAt(directory, inherited);
      const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
      for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        const relative = path.relative(root, absolute).replace(/\\/g, '/');
        if (entry.isSymbolicLink() || isPrivatePath(relative)) { skipped++; continue; }
        if (excludedBy(absolute, entry.isDirectory(), rules)) { skipped++; continue; }
        if (entry.isDirectory()) walk(absolute, rules, depth + 1);
        else addFile(absolute);
      }
    };
    if (single) {
      if (excludedBy(canonical, false, rulesAt(root, inheritedRules))) skipped++; else addFile(canonical);
    } else if (inheritedRules.length && excludedBy(root, true, inheritedRules)) skipped++;
    else walk(root, inheritedRules, 0);
    return Object.freeze({ root, files: Object.freeze(files), skipped, truncated, bytes });
  }
}
