/**
 * @fileoverview Validadores de entrada reutilizables (rutas, ramas, remotos, autores).
 * Todos lanzan ValidationError (HTTP 400) cuando el dato no es seguro.
 * @module utils/validacion
 */

import * as path from 'node:path';
import { ValidationError } from '../middleware/error.middleware.js';

const MAX_LONGITUD_RUTA = 300;

export interface RutaSegura {
  /** Ruta absoluta dentro de baseDir (para fs.writeFile) */
  absoluta: string;
  /** Ruta relativa con "/" (para `git add -- <ruta>`) */
  relativa: string;
}

/**
 * Convierte una ruta que viene del cliente en una ruta SEGURA dentro de `baseDir`.
 * Rechaza: no-texto, vacía, demasiado larga, byte nulo, absolutas (/x, C:\x),
 * segmentos "..", segmentos ".git" y cualquier ruta que acabe fuera de baseDir.
 */
export function resolverRutaSegura(baseDir: string, rutaCliente: unknown): RutaSegura {
  if (typeof rutaCliente !== 'string' || rutaCliente.length === 0 || rutaCliente.length > MAX_LONGITUD_RUTA) {
    throw new ValidationError('Ruta de archivo inválida: debe ser texto de 1 a 300 caracteres.');
  }
  if (rutaCliente.includes('\0')) {
    throw new ValidationError('Ruta de archivo inválida: contiene un byte nulo.');
  }

  const normalizada = rutaCliente.replace(/\\/g, '/');
  if (normalizada.startsWith('/') || /^[a-zA-Z]:/.test(normalizada)) {
    throw new ValidationError(`Ruta absoluta no permitida: "${rutaCliente}".`);
  }

  const segmentos = normalizada.split('/');
  if (segmentos.some((s) => s === '..')) {
    throw new ValidationError(`Ruta no permitida (contiene ".."): "${rutaCliente}".`);
  }
  if (segmentos.some((s) => s.toLowerCase() === '.git')) {
    throw new ValidationError(`Ruta no permitida (carpeta reservada): "${rutaCliente}".`);
  }

  const base = path.resolve(baseDir);
  const absoluta = path.resolve(base, normalizada);
  if (absoluta === base || !absoluta.startsWith(base + path.sep)) {
    throw new ValidationError(`Ruta fuera del directorio permitido: "${rutaCliente}".`);
  }

  return { absoluta, relativa: path.relative(base, absoluta).split(path.sep).join('/') };
}

const REGEX_RAMA = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;

/** Valida un nombre de rama de Git (sin "--", sin "..", sin terminar en "/" o ".lock"). */
export function validarNombreRama(rama: unknown): string {
  if (
    typeof rama !== 'string' ||
    !REGEX_RAMA.test(rama) ||
    rama.includes('..') ||
    rama.includes('//') ||
    rama.endsWith('/') ||
    rama.endsWith('.lock')
  ) {
    throw new ValidationError('Nombre de rama inválido. Usa letras, números, ".", "_", "-" y "/" (máx. 100).');
  }
  return rama;
}

const REGEX_REMOTE_GITHUB = /^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(?:\.git)?$/;

/** Solo se aceptan remotos HTTPS de github.com con formato https://github.com/owner/repo(.git). */
export function validarRemoteUrl(url: unknown): string {
  if (typeof url !== 'string' || !REGEX_REMOTE_GITHUB.test(url.trim())) {
    throw new ValidationError('remoteUrl inválida. Formato permitido: https://github.com/owner/repo.git');
  }
  return url.trim();
}

const REGEX_TOKEN_GITHUB = /^[A-Za-z0-9_]{10,255}$/;

/** Token de GitHub: solo letras, números y "_" (sin "@", "/", ":" ni espacios). */
export function validarTokenGithub(token: unknown): string {
  if (typeof token !== 'string' || !REGEX_TOKEN_GITHUB.test(token.trim())) {
    throw new ValidationError('githubToken con formato inválido.');
  }
  return token.trim();
}

const REGEX_NOMBRE = /^[\p{L}\p{N} .,'’-]{1,100}$/u;
const REGEX_EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}$/;

/** Nombre de persona: letras (con tildes), números, espacio, ".", ",", "'" y "-". */
export function validarNombrePersona(nombre: unknown): string {
  if (typeof nombre !== 'string' || !REGEX_NOMBRE.test(nombre.trim())) {
    throw new ValidationError('Nombre inválido: usa solo letras, números, espacios, ".", "," "\'" y "-" (máx. 100).');
  }
  return nombre.trim();
}

export function validarEmail(email: unknown): string {
  if (typeof email !== 'string' || !REGEX_EMAIL.test(email.trim())) {
    throw new ValidationError('Correo electrónico inválido.');
  }
  return email.trim();
}

const REGEX_AUTOR_GIT = /^[\p{L}\p{N} .,'’-]{1,100} <[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}>$/u;

/** Valida la cadena `Nombre <correo@dominio.com>` usada en `git commit --author=...`. */
export function validarAutorGit(autor: unknown): string {
  if (typeof autor !== 'string' || !REGEX_AUTOR_GIT.test(autor)) {
    throw new ValidationError('Autor de commit inválido. Formato: Nombre <correo@dominio.com>');
  }
  return autor;
}

const REGEX_MENSAJE_COMMIT = /^[^"`$\\%\r\n]{1,200}$/;

/** Mensaje de commit: 1-200 caracteres, una sola línea, sin comillas dobles, "`", "$", "\" ni "%". */
export function validarMensajeCommit(mensaje: unknown): string {
  if (typeof mensaje !== 'string' || !REGEX_MENSAJE_COMMIT.test(mensaje)) {
    throw new ValidationError('Mensaje de commit inválido (1-200 caracteres, una línea, sin " ` $ \\ %).');
  }
  return mensaje;
}
