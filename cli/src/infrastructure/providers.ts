import { AresError } from '../shared/domain/errors.js';

export const PROVIDERS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    key: 'OPENROUTER_API_KEY',
    model: 'OPENROUTER_MODEL',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    key: 'GEMINI_API_KEY',
    model: 'GEMINI_MODEL',
  },
  mistral: { baseUrl: 'https://api.mistral.ai/v1', key: 'MISTRAL_API_KEY', model: 'MISTRAL_MODEL' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', key: 'GROQ_API_KEY', model: 'GROQ_MODEL' },
  cohere: {
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    key: 'COHERE_API_KEY',
    model: 'COHERE_MODEL',
  },
  compatible: {
    baseUrl: 'http://127.0.0.1:11434/v1',
    key: 'COMPATIBLE_API_KEY',
    model: 'COMPATIBLE_MODEL',
  },
} as const;

export type Provider = keyof typeof PROVIDERS;
export const providerNames = Object.keys(PROVIDERS) as Provider[];

export function providerDefinition(name: string) {
  if (!Object.hasOwn(PROVIDERS, name))
    throw new AresError('CONFIG', `Proveedor inválido: usa ${providerNames.join(', ')}.`);
  return PROVIDERS[name as Provider];
}

export function redactCredentials(text: string, secrets: readonly string[]): string {
  for (const secret of [...new Set(secrets)].filter(Boolean).sort((a, b) => b.length - a.length))
    text = text.split(secret).join('[REDACTED]');
  return text;
}
