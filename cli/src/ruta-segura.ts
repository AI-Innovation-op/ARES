import * as path from 'node:path';

/**
 * Une `carpetaSalida` + `rutaRelativa` y garantiza que el resultado quede DENTRO de la carpeta.
 * Lanza un Error si la ruta intenta salir ("../", rutas absolutas, etc.).
 */
export function rutaDestinoSegura(carpetaSalida: string, rutaRelativa: string): string {
  const base = path.resolve(carpetaSalida);
  const destino = path.resolve(base, rutaRelativa);
  if (destino === base || !destino.startsWith(base + path.sep)) {
    throw new Error(`Ruta insegura recibida del servidor (fuera de la carpeta de salida): "${rutaRelativa}"`);
  }
  return destino;
}
