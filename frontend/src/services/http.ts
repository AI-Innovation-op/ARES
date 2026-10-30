/**
 * @fileoverview Cliente HTTP único del frontend de A.R.E.S.
 * - Una sola URL base para TODO el frontend (VITE_API_URL).
 * - Envía la cabecera `x-api-key` en cada petición.
 * - Si el servidor responde 401, pide la clave UNA vez, la guarda en sessionStorage y reintenta.
 * @module services/http
 */

import axios, { type AxiosInstance } from 'axios';

/**
 * URL del backend. Vacío ('') = mismo origen:
 *  - en desarrollo, el proxy de Vite (vite.config.ts) reenvía /api a localhost:3000
 *  - en Docker, nginx reenvía /api al contenedor backend
 *  - en GitHub Pages, define VITE_API_URL=https://tu-backend (ver deploy-pages.yml)
 */
function obtenerApiBaseOrigin(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    return 'https://ares-backend-ozs5.onrender.com';
  }
  return '';
}

export const API_BASE_ORIGIN: string = obtenerApiBaseOrigin();

const CLAVE_STORAGE = 'ares.api_key';

/** Copia en memoria por si el navegador bloquea sessionStorage (modo privado). */
let claveMemoria = '';

function leerClave(): string {
  try {
    return sessionStorage.getItem(CLAVE_STORAGE) || claveMemoria;
  } catch {
    return claveMemoria;
  }
}

function guardarClave(valor: string): void {
  claveMemoria = valor;
  try {
    sessionStorage.setItem(CLAVE_STORAGE, valor);
  } catch {
    /* sin storage: se usa solo la copia en memoria */
  }
}

let solicitudClave: Promise<string> | null = null;
let ultimaCancelacion = 0;

/**
 * Pide la clave con un cuadro de diálogo y la guarda. Si varias peticiones fallan a la vez,
 * pregunta una sola vez (todas comparten la misma promesa).
 */
function pedirClave(): Promise<string> {
  solicitudClave ??= (async () => {
    const valor = window.prompt('Clave de acceso de A.R.E.S. (ARES_API_KEY del servidor):') ?? '';
    if (valor) guardarClave(valor);
    else ultimaCancelacion = Date.now();
    return valor;
  })().finally(() => {
    solicitudClave = null;
  });
  return solicitudClave;
}

/**
 * Tras un 401: devuelve la clave con la que reintentar, o '' si no hay.
 * - Si otra petición ya consiguió una clave distinta a la que usó esta, se reutiliza sin volver a preguntar.
 * - Si el usuario canceló hace menos de 1 minuto, no se vuelve a molestar.
 */
async function claveParaReintentar(claveUsada: string): Promise<string> {
  const actual = leerClave();
  if (actual && actual !== claveUsada) return actual;
  if (Date.now() - ultimaCancelacion < 60_000) return '';
  return pedirClave();
}

/** fetch con URL base, x-api-key y reintento tras 401. `ruta` empieza por "/api/..." */
export async function apiFetch(ruta: string, init: RequestInit = {}, reintentar = true): Promise<Response> {
  const cabeceras = new Headers(init.headers);
  const clave = leerClave();
  if (clave) cabeceras.set('x-api-key', clave);

  const respuesta = await fetch(`${API_BASE_ORIGIN}${ruta}`, { ...init, headers: cabeceras });

  if (respuesta.status === 401 && reintentar && (await claveParaReintentar(clave))) {
    return apiFetch(ruta, init, false);
  }
  return respuesta;
}

/** Añade x-api-key y el reintento tras 401 a una instancia de axios. */
export function protegerAxios(instancia: AxiosInstance): void {
  instancia.interceptors.request.use((config) => {
    const clave = leerClave();
    if (clave) config.headers.set('x-api-key', clave);
    return config;
  });

  instancia.interceptors.response.use(undefined, async (error) => {
    const config = error?.config as any;
    if (error?.response?.status === 401 && config && !config.__reintentado) {
      const usada = String(config.headers?.get?.('x-api-key') ?? '');
      if (await claveParaReintentar(usada)) {
        config.__reintentado = true;
        return instancia.request(config);
      }
    }
    return Promise.reject(error);
  });
}

// El axios global (usado por assignment, swarm y GithubAuditModal) queda protegido al importar este módulo.
protegerAxios(axios);
