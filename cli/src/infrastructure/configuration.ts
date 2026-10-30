import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'dotenv';
import { AresError } from '../shared/domain/errors.js';

export type Provider = 'openrouter' | 'gemini' | 'compatible';
export interface Configuration {
  readonly home: string;
  readonly envFile: string;
  readonly provider: Provider;
  readonly model: string;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs: number;
  readonly maxTokens: number;
}

const ENDPOINTS: Record<Provider, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  compatible: 'http://127.0.0.1:11434/v1',
};

export function loadConfiguration(
  overrides: { provider?: string; model?: string } = {},
  environment: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): Configuration {
  const home = path.resolve(environment.ARES_HOME || path.join(os.homedir(), '.ares'));
  const envFile = environment.ARES_ENV_FILE
    ? path.resolve(cwd, environment.ARES_ENV_FILE)
    : path.join(home, '.env');
  const env: Record<string, string | undefined> = {};
  for (const file of [envFile, path.join(cwd, '.env')]) {
    if (fs.existsSync(file)) Object.assign(env, parse(fs.readFileSync(file)));
  }
  Object.assign(env, environment);
  const provider =
    overrides.provider ||
    env.ARES_PROVIDER ||
    (env.OPENROUTER_API_KEY
      ? 'openrouter'
      : env.GEMINI_API_KEY
        ? 'gemini'
        : env.ARES_BASE_URL
          ? 'compatible'
          : 'openrouter');
  if (!['openrouter', 'gemini', 'compatible'].includes(provider))
    throw new AresError('CONFIG', 'Proveedor inválido: usa openrouter, gemini o compatible.');
  const selected = provider as Provider;
  const baseUrl = (env.ARES_BASE_URL || ENDPOINTS[selected]).replace(/\/+$/, '');
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
  if (selected !== 'compatible' && baseUrl !== ENDPOINTS[selected]) {
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
  const model = overrides.model ?? env.ARES_MODEL ?? '';
  if (model.length > 200 || /[\x00-\x1f\x7f]/.test(model))
    throw new AresError(
      'CONFIG',
      'El identificador de modelo no admite controles ni más de 200 caracteres.',
    );
  return Object.freeze({
    home,
    envFile,
    provider: selected,
    model,
    baseUrl,
    apiKey:
      env.ARES_API_KEY_DIRECT ||
      (selected === 'openrouter'
        ? env.OPENROUTER_API_KEY
        : selected === 'gemini'
          ? env.GEMINI_API_KEY
          : env.COMPATIBLE_API_KEY) ||
      '',
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
      `Falta ${config.provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENROUTER_API_KEY'}. Guárdala localmente en ${config.envFile}; ares config init crea la plantilla.`,
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
  const key =
    config.provider === 'gemini'
      ? 'GEMINI_API_KEY'
      : config.provider === 'openrouter'
        ? 'OPENROUTER_API_KEY'
        : 'COMPATIBLE_API_KEY';
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
