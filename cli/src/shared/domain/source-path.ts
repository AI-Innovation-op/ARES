import { AresError } from './errors.js';

const PRIVATE_NAME =
  /^(?:\.env(?:\..+)?|\.npmrc|\.pypirc|\.netrc|credentials(?:\..+)?|secrets?(?:\..+)?|id_(?:rsa|ed25519)|.*\.(?:pem|key|p12|pfx))$/i;
const EXAMPLE_ENV = /^\.env\.(?:example|sample|template)$/i;
const EXCLUDED_DIR =
  /^(?:\.git|\.svn|\.hg|\.ares|\.ssh|\.aws|\.azure|\.config|node_modules|dist|build|coverage|\.next|\.nuxt|\.venv|venv|__pycache__|vendor|target|bin|obj)$/i;

export function isPrivatePath(relative: string): boolean {
  return relative
    .replace(/\\/g, '/')
    .split('/')
    .some(
      (part) => EXCLUDED_DIR.test(part) || (PRIVATE_NAME.test(part) && !EXAMPLE_ENV.test(part)),
    );
}

/** Portable path value object. Never accepts OS-specific normalization tricks. */
export class SourcePath {
  readonly value: string;
  constructor(value: string) {
    if (typeof value !== 'string' || value.length > 240 || /[\\\x00-\x1f\x7f:*?"<>|]/.test(value)) {
      throw new AresError('VALIDATION', `Ruta no permitida: ${String(value)}`);
    }
    const parts = value.split('/');
    if (
      parts.some(
        (p) =>
          !p ||
          p === '.' ||
          p === '..' ||
          /[. ]$/.test(p) ||
          /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p),
      ) ||
      isPrivatePath(value)
    ) {
      throw new AresError('VALIDATION', `Ruta no permitida: ${value}`);
    }
    this.value = value;
    Object.freeze(this);
  }
}

export interface SourceFile {
  readonly path: string;
  readonly content: string;
  readonly hash: string;
}

export interface Snapshot {
  readonly root: string;
  readonly files: readonly SourceFile[];
  readonly skipped: number;
  readonly truncated: boolean;
  readonly bytes: number;
}
