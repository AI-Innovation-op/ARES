/**
 * @fileoverview Cliente HTTP único del frontend de A.R.E.S.
 * - Una sola URL base para TODO el frontend (VITE_API_URL).
 * - Envía la cabecera `x-api-key` en cada petición si está configurada.
 * - Soporta persistencia de clave en localStorage y sessionStorage.
 * @module services/http
 */

import axios, { type AxiosInstance } from 'axios';

/**
 * URL del backend. Vacío ('') = mismo origen:
 *  - en desarrollo, el proxy de Vite (vite.config.ts) reenvía /api a localhost:3000
 *  - en Docker, nginx reenvía /api al contenedor backend
 *  - en GitHub Pages, define VITE_API_URL=https://tu-backend o recurre al backend de Render
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

/** Copia en memoria por si el navegador bloquea sessionStorage/localStorage (modo privado). */
let claveMemoria = '';

export function leerClave(): string {
  try {
    const envKey = (import.meta.env.VITE_ARES_API_KEY as string | undefined)?.trim();
    return (
      sessionStorage.getItem(CLAVE_STORAGE) ||
      localStorage.getItem(CLAVE_STORAGE) ||
      claveMemoria ||
      envKey ||
      ''
    );
  } catch {
    return claveMemoria;
  }
}

export function guardarClave(valor: string): void {
  claveMemoria = valor.trim();
  try {
    if (claveMemoria) {
      sessionStorage.setItem(CLAVE_STORAGE, claveMemoria);
      localStorage.setItem(CLAVE_STORAGE, claveMemoria);
    } else {
      sessionStorage.removeItem(CLAVE_STORAGE);
      localStorage.removeItem(CLAVE_STORAGE);
    }
  } catch {
    /* sin storage: se usa solo la copia en memoria */
  }
}

let solicitudClave: Promise<string> | null = null;
let ultimaCancelacion = 0;

/**
 * Pide la clave con un cuadro de diálogo y la guarda de forma segura si está disponible.
 * Protegido contra entornos sin window.prompt().
 */
function pedirClave(): Promise<string> {
  solicitudClave ??= (async () => {
    let valor = '';
    try {
      if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
        valor = window.prompt('Clave de acceso de A.R.E.S. (ARES_API_KEY del servidor):') ?? '';
      }
    } catch {
      valor = '';
    }
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

// El axios global queda protegido al importar este módulo.
protegerAxios(axios);
