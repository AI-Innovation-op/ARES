/**
 * fetch que añade la cabecera x-api-key (variable ARES_API_KEY) a las peticiones al backend de A.R.E.S.
 * Úsalo SOLO para URLs del backend (nunca para sitios de terceros: filtraría la clave).
 */
export async function apiFetch(url: string | URL, init: RequestInit = {}): Promise<Response> {
  const cabeceras = new Headers(init.headers);
  const clave = process.env.ARES_API_KEY;
  if (clave) cabeceras.set('x-api-key', clave);

  const respuesta = await fetch(url, { ...init, headers: cabeceras });
  if (respuesta.status === 401) {
    console.error('🔒 El backend rechazó la clave de acceso (401). Define ARES_API_KEY con la misma clave que usa el servidor.');
  }
  return respuesta;
}
