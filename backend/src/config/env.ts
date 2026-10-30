/**
 * @fileoverview Configuración de variables de entorno validadas.
 * Carga las variables desde .env y garantiza que las obligatorias existan.
 * @module config/env
 */

import dotenv from 'dotenv';

// Cargar archivo .env al iniciar
dotenv.config();

/**
 * Interfaz tipada de la configuración del entorno.
 * Todas las variables obligatorias tienen tipo `string`;
 * las opcionales tienen valores por defecto sensatos.
 */
export interface ConfiguracionEntorno {
  /** URL de conexión a PostgreSQL */
  DATABASE_URL: string;
  /** Clave de API de Google Gemini */
  GEMINI_API_KEY: string;
  /** URL de conexión a Redis */
  REDIS_URL: string;
  /** Puerto del servidor Express */
  PORT: number;
  /** Origen permitido para CORS */
  CORS_ORIGIN: string;
  /** Indica si estamos en producción */
  NODE_ENV: string;
  /** Clave de API de OpenRouter (opcional/multi-modelo) */
  OPENROUTER_API_KEY: string;
  /** Modelo por defecto de OpenRouter */
  OPENROUTER_DEFAULT_MODEL: string;
  /** Proveedor primario de LLM ('gemini' | 'openrouter') */
  LLM_PROVIDER: string;
  /** Modelo de texto de Google Gemini */
  GEMINI_TEXT_MODEL: string;
  /** Clave para acceder a la API (cabecera x-api-key). Obligatoria en producción */
  ARES_API_KEY: string;
  /** Saltos de proxy confiables (Render = 1; Render + nginx propio = 2; local = 0) */
  TRUST_PROXY_HOPS: number;
}

/**
 * Configuración global validada del entorno.
 * Se evalúa una sola vez al importar el módulo.
 */
export const env: ConfiguracionEntorno = {
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  GEMINI_API_KEY: process.env['GEMINI_API_KEY'] ?? '',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  PORT: Number.parseInt(process.env['PORT'] ?? '3000', 10) || 3000,
  CORS_ORIGIN: process.env['CORS_ORIGIN'] ?? '*',
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  OPENROUTER_API_KEY: process.env['OPENROUTER_API_KEY'] ?? '',
  OPENROUTER_DEFAULT_MODEL: process.env['OPENROUTER_DEFAULT_MODEL'] ?? 'deepseek/deepseek-chat',
  LLM_PROVIDER: process.env['LLM_PROVIDER'] ?? (process.env['GEMINI_API_KEY'] ? 'gemini' : 'openrouter'),
  GEMINI_TEXT_MODEL: process.env['GEMINI_TEXT_MODEL'] ?? 'gemini-3-flash-preview',
  ARES_API_KEY: process.env['ARES_API_KEY'] ?? '',
  TRUST_PROXY_HOPS: Number.parseInt(process.env['TRUST_PROXY_HOPS'] ?? '0', 10) || 0,
};

// ---- Validaciones de arranque: advertir con un mensaje claro ----
if (!env.GEMINI_API_KEY && !env.OPENROUTER_API_KEY) {
  console.warn(
    '⚠️  [Config] Falta una clave de IA: define GEMINI_API_KEY u OPENROUTER_API_KEY en las variables de entorno.'
  );
}
if (env.NODE_ENV === 'production' && env.CORS_ORIGIN.trim() === '*') {
  console.warn(
    '⚠️  [Seguridad] CORS_ORIGIN="*" detectado en producción. Se recomienda restringir los dominios en las variables de entorno.'
  );
}
