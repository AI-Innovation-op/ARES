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
}

/**
 * Obtiene una variable de entorno obligatoria o lanza un error explícito.
 * @param nombre - Nombre de la variable de entorno
 * @returns Valor de la variable
 * @throws Error si la variable no está definida
 */
function variableObligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `⚠️  Variable de entorno obligatoria "${nombre}" no encontrada.\n` +
      `   Copia .env.example a .env y completa los valores.`
    );
  }
  return valor;
}

/**
 * Configuración global validada del entorno.
 * Se evalúa una sola vez al importar el módulo.
 */
export const env: ConfiguracionEntorno = {
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  GEMINI_API_KEY: variableObligatoria('GEMINI_API_KEY'),
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  PORT: parseInt(process.env['PORT'] ?? '3000', 10),
  CORS_ORIGIN: process.env['CORS_ORIGIN'] ?? '*',
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  OPENROUTER_API_KEY: process.env['OPENROUTER_API_KEY'] ?? '',
  OPENROUTER_DEFAULT_MODEL: process.env['OPENROUTER_DEFAULT_MODEL'] ?? 'deepseek/deepseek-chat',
  LLM_PROVIDER: process.env['LLM_PROVIDER'] ?? 'openrouter',
  GEMINI_TEXT_MODEL: process.env['GEMINI_TEXT_MODEL'] ?? 'gemini-3-flash-preview',
};
