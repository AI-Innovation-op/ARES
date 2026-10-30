/**
 * @fileoverview Clasificación de errores de base de datos.
 * @module utils/errores-db
 */

const CODIGOS_DE_CONEXION = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN',
  '57P01', '57P02', '57P03', // PostgreSQL: servidor apagándose / reiniciando
]);

/**
 * true solo si el error indica que NO se pudo hablar con la base de datos
 * (caída o red). Errores de SQL (sintaxis, constraint, tipos) devuelven false.
 */
export function esErrorDeConexion(error: any): boolean {
  const codigo = String(error?.code ?? '');
  if (CODIGOS_DE_CONEXION.has(codigo) || codigo.startsWith('08')) return true;
  if (Array.isArray(error?.errors)) return error.errors.some((e: any) => esErrorDeConexion(e));
  return false;
}
