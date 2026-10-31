import axios, { type AxiosInstance } from 'axios';

function apiOrigin(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
    ? 'https://ares-backend-ozs5.onrender.com'
    : '';
}
export const API_BASE_ORIGIN = apiOrigin();
const storageKey = 'ares.api_key';
let memoryKey: string | null = null;
export function leerClave(): string {
  if (memoryKey !== null) return memoryKey;
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) return stored;
  } catch {
    /* Try the explicit persistent choice separately. */
  }
  try {
    return localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}
export function guardarClave(value: string, persist = false): void {
  memoryKey = value.trim();
  try {
    if (memoryKey) {
      sessionStorage.setItem(storageKey, memoryKey);
    } else sessionStorage.removeItem(storageKey);
  } catch {
    /* Storage may be unavailable; the key remains only in memory. */
  }
  try {
    if (persist && memoryKey) localStorage.setItem(storageKey, memoryKey);
    else localStorage.removeItem(storageKey);
  } catch {
    /* An explicit in-memory key always takes precedence over old storage. */
  }
}
/** Authentication is explicit in the connection dialog; requests never open native prompts. */
export async function apiFetch(
  route: string,
  init: RequestInit = {},
  _retry = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const key = leerClave();
  if (key) headers.set('x-api-key', key);
  return fetch(`${API_BASE_ORIGIN}${route}`, { ...init, headers });
}
export function protegerAxios(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const key = leerClave();
    if (key) config.headers.set('x-api-key', key);
    return config;
  });
}
protegerAxios(axios);
