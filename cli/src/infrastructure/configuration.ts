import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parse } from 'dotenv';
import { AresError } from '../shared/domain/errors.js';
import { LocalChangeWorkspace } from './change-workspace.js';
import { PROVIDERS, providerDefinition, providerNames, type Provider } from './providers.js';

export type { Provider } from './providers.js';
export interface Configuration {
  readonly home: string;
  readonly envFile: string;
  readonly provider: Provider;
  readonly model: string;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly secrets: readonly string[];
  readonly timeoutMs: number;
  readonly maxTokens: number;
}

export function configurationLocation(
  environment: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
) {
  const home = path.resolve(environment.ARES_HOME || path.join(os.homedir(), '.ares'));
  return {
    home,
    envFile: environment.ARES_ENV_FILE
      ? path.resolve(cwd, environment.ARES_ENV_FILE)
      : path.join(home, '.env'),
  };
}

export function loadConfiguration(
  overrides: { provider?: string; model?: string } = {},
  environment: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): Configuration {
  const { home, envFile } = configurationLocation(environment, cwd);
  const env: Record<string, string | undefined> = {};
  const ranks: Record<string, number> = {};
  const sources = [
    fs.existsSync(envFile) ? parse(fs.readFileSync(envFile)) : {},
    fs.existsSync(path.join(cwd, '.env')) ? parse(fs.readFileSync(path.join(cwd, '.env'))) : {},
    environment,
  ];
  sources.forEach((source, rank) => {
    for (const [key, value] of Object.entries(source))
      if (value !== undefined) {
        env[key] = value;
        ranks[key] = rank;
      }
  });
  return resolveConfiguration(overrides, env, home, envFile, ranks);
}

function resolveConfiguration(
  overrides: { provider?: string; model?: string },
  env: Record<string, string | undefined>,
  home: string,
  envFile: string,
  ranks: Readonly<Record<string, number>> = {},
): Configuration {
  const provider =
    overrides.provider ||
    env.ARES_PROVIDER ||
    providerNames.find((name) => name !== 'compatible' && env[PROVIDERS[name].key]) ||
    (env.ARES_BASE_URL ? 'compatible' : 'openrouter');
  const definition = providerDefinition(provider);
  const selected = provider as Provider;
  const useBase = selected === 'compatible' || !env.ARES_PROVIDER || env.ARES_PROVIDER === selected;
  const baseUrl = ((useBase ? env.ARES_BASE_URL : undefined) || definition.baseUrl).replace(
    /\/+$/,
    '',
  );
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new AresError('CONFIG', 'ARES_BASE_URL debe ser una URL válida.');
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['http:', 'https:'].includes(url.protocol)
  ) {
    throw new AresError('CONFIG', 'ARES_BASE_URL no admite credenciales, query ni fragmentos.');
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new AresError(
      'CONFIG',
      'Usa HTTPS para proveedores remotos; HTTP solo está permitido en loopback.',
    );
  }
  if (selected !== 'compatible' && baseUrl !== definition.baseUrl) {
    throw new AresError(
      'CONFIG',
      'ARES_BASE_URL personalizado requiere ARES_PROVIDER=compatible y su propia COMPATIBLE_API_KEY.',
    );
  }
  const integer = (
    value: string | undefined,
    fallback: number,
    min: number,
    max: number,
    label: string,
  ): number => {
    const number = value === undefined ? fallback : Number(value);
    if (!Number.isInteger(number) || number < min || number > max)
      throw new AresError('CONFIG', `${label} debe estar entre ${min} y ${max}.`);
    return number;
  };
  const genericModelAllowed = !env.ARES_PROVIDER || env.ARES_PROVIDER === selected;
  const useGeneric =
    genericModelAllowed &&
    env.ARES_MODEL !== undefined &&
    ((ranks.ARES_MODEL ?? 0) > (ranks[definition.model] ?? 0) ||
      env[definition.model] === undefined);
  const model = overrides.model ?? (useGeneric ? env.ARES_MODEL : env[definition.model]) ?? '';
  if (model.length > 200 || /[\x00-\x1f\x7f]/.test(model))
    throw new AresError(
      'CONFIG',
      'El identificador de modelo no admite controles ni más de 200 caracteres.',
    );
  const credentialName = definition.key;
  const apiKey = env[credentialName] || '';
  if (env.ARES_API_KEY_DIRECT && !apiKey)
    throw new AresError(
      'CONFIG',
      `Usa ${credentialName} en lugar del alias genérico ARES_API_KEY_DIRECT. Puedes actualizarla con config set --key-stdin.`,
    );
  if (apiKey.length > 4096 || /[\x00-\x20\x7f]/.test(apiKey))
    throw new AresError('CONFIG', 'La clave configurada tiene un formato inválido.');
  return Object.freeze({
    home,
    envFile,
    provider: selected,
    model,
    baseUrl,
    apiKey,
    secrets: Object.freeze([
      ...new Set(providerNames.map((name) => env[PROVIDERS[name].key] || '').filter(Boolean)),
    ]),
    timeoutMs: integer(env.ARES_TIMEOUT_MS, 120_000, 100, 600_000, 'ARES_TIMEOUT_MS'),
    maxTokens: integer(env.ARES_MAX_TOKENS, 8192, 128, 32768, 'ARES_MAX_TOKENS'),
  });
}

export function requireAi(config: Configuration): void {
  if (!config.model || /[\r\n]/.test(config.model))
    throw new AresError(
      'CONFIG',
      'Configura ARES_MODEL con un modelo disponible en tu proveedor. Ejecuta: ares config init',
    );
  if (config.provider !== 'compatible' && !config.apiKey) {
    throw new AresError(
      'CONFIG',
      `Falta ${PROVIDERS[config.provider].key}. Guárdala localmente en ${config.envFile}; ares config init crea la plantilla.`,
    );
  }
}

export function publicConfiguration(config: Configuration) {
  return {
    home: config.home,
    envFile: config.envFile,
    provider: config.provider,
    model: config.model || null,
    baseUrl: config.baseUrl,
    credentialConfigured: Boolean(config.apiKey),
    timeoutMs: config.timeoutMs,
    maxTokens: config.maxTokens,
  };
}

export function initializeConfiguration(config: Configuration): string {
  fs.mkdirSync(path.dirname(config.envFile), { recursive: true, mode: 0o700 });
  const key = PROVIDERS[config.provider].key;
  try {
    fs.writeFileSync(
      config.envFile,
      `# ARES CLI: edita este archivo localmente. No publiques credenciales.\nARES_PROVIDER=${config.provider}\nARES_MODEL=${config.model}\n${key}=\n# ARES_BASE_URL=${config.baseUrl}\n`,
      { flag: 'wx', mode: 0o600 },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new AresError(
        'CONFLICT',
        `La configuración ya existe: ${config.envFile}. Edítala localmente.`,
      );
    throw error;
  }
  return config.envFile;
}

export interface ConfigurationUpdate {
  provider?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

/** Preserve unrelated .env text and verify parsing before committing an atomic replacement. */
export function updateConfiguration(
  update: ConfigurationUpdate,
  environment: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): Configuration {
  const { home, envFile } = configurationLocation(environment, cwd);
  fs.mkdirSync(path.dirname(envFile), { recursive: true, mode: 0o700 });
  return new LocalChangeWorkspace().withLock(fs.realpathSync(path.dirname(envFile)), () =>
    updateConfigurationLocked(update, home, envFile, environment),
  );
}

function updateConfigurationLocked(
  update: ConfigurationUpdate,
  home: string,
  envFile: string,
  environment: NodeJS.ProcessEnv,
): Configuration {
  let original: string | null = null;
  try {
    const stat = fs.lstatSync(envFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64_000)
      throw new AresError('CONFIG', 'La configuración debe ser un archivo regular de hasta 64 KB.');
    original = fs.readFileSync(envFile, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const previous = parse(original || '');
  const provider =
    update.provider || previous.ARES_PROVIDER || environment.ARES_PROVIDER || 'openrouter';
  const definition = providerDefinition(provider);
  const changes: Record<string, string | null> = { ARES_PROVIDER: provider };
  if (
    provider !== previous.ARES_PROVIDER &&
    providerNames.some((name) => name === previous.ARES_PROVIDER)
  ) {
    const oldProfile = PROVIDERS[previous.ARES_PROVIDER as Provider].model;
    if (previous[oldProfile] === undefined && previous.ARES_MODEL !== undefined)
      changes[oldProfile] = previous.ARES_MODEL;
  }
  if (provider !== previous.ARES_PROVIDER) changes.ARES_API_KEY_DIRECT = null;
  if (update.model !== undefined) {
    changes.ARES_MODEL = update.model;
    changes[definition.model] = update.model;
  } else if (provider !== previous.ARES_PROVIDER) {
    changes.ARES_MODEL = previous[definition.model] || '';
  }
  if (update.baseUrl !== undefined) changes.ARES_BASE_URL = update.baseUrl;
  else if (provider !== previous.ARES_PROVIDER) changes.ARES_BASE_URL = null;
  if (update.apiKey !== undefined) {
    if (
      update.apiKey.length < 8 ||
      update.apiKey.length > 4096 ||
      /[\x00-\x20\x7f]/.test(update.apiKey)
    )
      throw new AresError(
        'CONFIG',
        'La clave requiere entre 8 y 4096 caracteres, sin espacios ni controles.',
      );
    changes[definition.key] = update.apiKey;
    changes.ARES_API_KEY_DIRECT = null;
  }
  const values = { ...previous };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete values[key];
    else values[key] = value;
  }
  const validated = resolveConfiguration({}, values, home, envFile);
  const quote = (value: string) => {
    if (/[\r\n\x00]/.test(value))
      throw new AresError('CONFIG', 'Los valores de configuración no admiten saltos de línea.');
    if (!value.includes("'")) return `'${value}'`;
    if (!value.includes('"') && !value.includes('\\')) return `"${value}"`;
    if (!value.includes('`')) return '`' + value + '`';
    throw new AresError('CONFIG', 'El valor no se puede guardar de forma segura en .env.');
  };
  const assignment =
    /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*(?:'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`[^`]*`|[^\r\n]*)(?:[ \t]*#[^\r\n]*)?/gm;
  const seen = new Set<string>();
  let content = (original || '').replace(assignment, (match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(changes, key)) return match;
    seen.add(key);
    return changes[key] === null ? '' : `${key}=${quote(changes[key]!)}`;
  });
  for (const [key, value] of Object.entries(changes))
    if (!seen.has(key) && value !== null)
      content += (content.endsWith('\n') || !content ? '' : '\n') + `${key}=${quote(value)}\n`;
  const parsed = parse(content);
  for (const [key, value] of Object.entries(values))
    if (parsed[key] !== value)
      throw new AresError(
        'CONFLICT',
        'El formato de .env no permite una actualización segura; no se modificó.',
      );
  for (const [key, value] of Object.entries(changes))
    if (value === null && parsed[key] !== undefined)
      throw new AresError('CONFLICT', 'No se pudo actualizar la configuración de forma segura.');
  fs.mkdirSync(path.dirname(envFile), { recursive: true, mode: 0o700 });
  const temporary = path.join(path.dirname(envFile), '.ares-config-' + randomUUID() + '.tmp');
  try {
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try {
      fs.writeFileSync(fd, content, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const current = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : null;
    if (current !== original)
      throw new AresError(
        'CONFLICT',
        'La configuración cambió en otro proceso; vuelve a intentarlo.',
      );
    fs.renameSync(temporary, envFile);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return validated;
}
