/**
 * @fileoverview Servicio del Módulo Espada Binaria (Auditoría, SOLID, Big-O y OWASP).
 * Analiza código fuente, calcula métricas algorítmicas y refactoriza con grado industrial.
 * @module services/codesword.service
 */

import { invocarGemini } from './gemini.service.js';
import { consulta } from '../config/db.js';
import { obtenerOCrearComandantePorDefecto } from '../repositories/commanders.repo.js';
import { obtenerOCrearRepositorioPorDefecto } from '../repositories/repositories.repo.js';
import type { AuditRequest, AuditResponse } from '../types/api.types.js';
import type { Metricas } from '../types/ares.types.js';

/**
 * Parsea la línea de cabecera obligatoria de métricas de la Espada Binaria.
 * Formato esperado:
 * METRICAS: BIG_O=[antes -> despues] | SOLID=[antes -> despues] | SEGURIDAD=[antes -> despues]
 */
export function parsearMetricas(linea: string): Metricas | null {
  const patron = /METRICAS:\s*BIG_O=\[(.+?)\s*->\s*(.+?)\]\s*\|\s*SOLID=\[(\d+)\s*->\s*(\d+)\]\s*\|\s*SEGURIDAD=\[(.+?)\s*->\s*(.+?)\]/i;
  const match = linea.match(patron);

  if (!match) {
    return null;
  }

  return {
    bigO_antes: match[1]?.trim() ?? 'O(n²)',
    bigO_despues: match[2]?.trim() ?? 'O(n)',
    solid_antes: parseInt(match[3] ?? '50', 10),
    solid_despues: parseInt(match[4] ?? '95', 10),
    seguridad_antes: match[5]?.trim() ?? 'MEDIA',
    seguridad_despues: match[6]?.trim() ?? 'BLINDADA',
  };
}

/**
 * Extrae bloques de código limpios del análisis Markdown.
 */
function extraerCodigoRefactorizado(texto: string, lenguaje: string): string {
  const regex = new RegExp(`\`\`\`(?:${lenguaje}|[a-z0-9_-]+)?\\s*\\n([\\s\\S]*?)\`\`\``, 'i');
  const match = texto.match(regex);
  return match ? match[1].trim() : texto;
}

/**
 * Ejecuta una auditoría de código con la Espada Binaria.
 */
export async function auditarYRefactorizarCodigo(
  request: AuditRequest
): Promise<AuditResponse> {
  const { language, code, repositoryId } = request;

  const prompt = `Actúa como la Espada Binaria de A.R.E.S. Ejecuta una auditoría exhaustiva y refactorización sobre el siguiente código en ${language}.

REGLA OBLIGATORIA:
La PRIMERA LÍNEA de tu respuesta DEBE tener estrictamente este formato (sin saltos previos ni texto antes):
METRICAS: BIG_O=[complejidad_antes -> complejidad_despues] | SOLID=[puntaje_0-100_antes -> puntaje_0-100_despues] | SEGURIDAD=[ALTA/MEDIA/CRITICA -> BLINDADA]

A continuación, estructura tu informe con las siguientes secciones:
1. ⚔️ **Diagnóstico de Vulnerabilidades y Malas Prácticas** (OWASP Top 10, code smells, violaciones SOLID).
2. 🚀 **Análisis de Complejidad Algorítmica** (Explicación del salto Big-O temporal y espacial).
3. 🛡️ **Código Refactorizado** (Limpio, tipado, modular, seguro y listo para producción, dentro de un bloque \`\`\`${language}).
4. 🧪 **Suite de Pruebas Unitarias** (Casos de éxito y casos borde).

CÓDIGO A AUDITAR:
\`\`\`${language}
${code}
\`\`\``;

  const respuesta = await invocarGemini({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    enableSearch: false,
  });

  const lineas = respuesta.texto.split('\n');
  const primeraLinea = lineas[0] ?? '';
  const metricas = parsearMetricas(primeraLinea);

  // Quitar la línea de métricas del texto que se muestra en pantalla
  const analisis = metricas ? lineas.slice(1).join('\n').trim() : respuesta.texto;
  const refactoredCode = extraerCodigoRefactorizado(analisis, language);

  // Persistir auditoría en BD (usando repositorio especificado o predeterminado)
  let repoId = repositoryId;
  if (!repoId || repoId === 'default') {
    try {
      const cmd = await obtenerOCrearComandantePorDefecto();
      const defRepo = await obtenerOCrearRepositorioPorDefecto(cmd.id);
      repoId = defRepo.id;
    } catch {}
  }

  if (repoId) {
    try {
      await consulta(
        `INSERT INTO code_audits (
           repository_id, file_path, original_complexity, optimized_complexity,
           solid_score_before, solid_score_after, security_before, security_after,
           vulnerabilities_found, refactored_code
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          repoId,
          'archivo_auditado.' + language,
          metricas?.bigO_antes ?? null,
          metricas?.bigO_despues ?? null,
          metricas?.solid_antes ?? null,
          metricas?.solid_despues ?? null,
          metricas?.seguridad_antes ?? null,
          metricas?.seguridad_despues ?? null,
          JSON.stringify([]),
          refactoredCode,
        ]
      );
    } catch (err) {
      console.warn('⚠️ [CodeSword] No se pudo guardar auditoría en BD:', err);
    }
  }

  return {
    analysis: analisis,
    refactoredCode,
    metrics: metricas,
    stance: 'SLASH',
    poseNumber: 11, // Corte Anime Binario
  };
}

export interface SolicitudTestForge {
  code: string;
  language: string;
  framework: string;
  focus?: string;
}

export interface RespuestaTestForge {
  testCode: string;
  framework: string;
  summary: string;
}

/**
 * Genera una suite de pruebas unitarias exhaustiva mediante el Test Forge Táctico.
 */
export async function generarSuitePruebas(params: SolicitudTestForge): Promise<RespuestaTestForge> {
  const { code, language, framework, focus = 'Casos de éxito, casos borde y excepciones' } = params;

  const prompt = `Actúa como el Test Forge de A.R.E.S. Genera una suite de pruebas unitarias de grado industrial en ${framework} para el siguiente código en ${language}.

REQUISITOS DEL BLINDAJE DE PRUEBAS:
1. Suite completa lista para ejecutar con ${framework} (incluye imports, mocks necesarios y aserciones).
2. Estructura de pruebas con cobertura de:
   - ✅ **Casos de Éxito (Happy Path)** con entradas normales y representativas.
   - ⚠️ **Casos Borde (Edge Cases)**: valores nulos, arrays vacíos, desbordamientos, cadenas vacías y tipos inesperados.
   - 🛡️ **Manejo de Errores y Excepciones**: validación de que lanza los errores esperados.
   - 🧪 **Aislamiento / Mocking** de llamadas externas, bases de datos o servicios de red si aplica.
3. El código del test DEBE ir dentro de un único bloque de código \`\`\`${language}.
4. Al final, incluye un breve resumen táctico de qué casos fueron blindados.

ENFOQUE SOLICITADO: ${focus}

CÓDIGO FUENTE A PROBAR:
\`\`\`${language}
${code}
\`\`\``;

  const respuesta = await invocarGemini({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    enableSearch: false,
  });

  const testCode = extraerCodigoRefactorizado(respuesta.texto, language);
  // El resumen es el texto fuera del bloque de código
  const summary = respuesta.texto.replace(/```[\s\S]*?```/g, '').trim();

  return {
    testCode,
    framework,
    summary,
  };
}
