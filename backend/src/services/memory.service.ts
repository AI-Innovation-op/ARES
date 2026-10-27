/**
 * @fileoverview Servicio de Memoria Semántica Vectorial Local & RAG Arquitectónico para A.R.E.S. v3.3.
 * Implementa almacenamiento vectorial de ultra baja latencia con node:sqlite,
 * generación de embeddings locales normalizados (L2) y cálculo de similitud de cosenos.
 * @module services/memory.service
 */

import crypto from 'node:crypto';
import { consultaSqlite, inicializarSqlite } from '../config/sqlite.js';

export type MemoryCollection = 'adr' | 'code_snippet' | 'openapi' | 'system_design' | 'security_rule' | 'general';

export interface ArchitecturalMemory {
  id: string;
  collection: MemoryCollection;
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, any>;
  embedding?: number[];
  similarityScore?: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  query: string;
  totalEncontrados: number;
  resultados: ArchitecturalMemory[];
  tiempoBusquedaMs: number;
}

export interface MemoryStats {
  totalMemorias: number;
  dimensionVectorial: number;
  porColeccion: Record<string, number>;
  totalTags: number;
  ultimaActualizacion: string;
}

const VECTOR_DIMENSIONS = 128;

// Palabras vacías en español e inglés para optimización de embeddings semánticos
const STOPWORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una',
  'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'son', 'entre',
  'está', 'cuando', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'también', 'me', 'hasta', 'hay', 'donde', 'quien',
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'with', 'of', 'or', 'as', 'by', 'that'
]);

/**
 * Semillas maestras de conocimiento arquitectónico de A.R.E.S.
 */
const MEMORIAS_SEMILLA: Array<{
  id: string;
  collection: MemoryCollection;
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, any>;
}> = [
  {
    id: 'adr-001-hexagonal',
    collection: 'adr',
    title: 'ADR-001: Arquitectura Hexagonal y Puertos/Adaptadores en Monorepo TypeScript',
    content: `# ADR-001: Arquitectura Hexagonal y Puertos/Adaptadores
## Contexto
El ecosistema A.R.E.S. requiere aislar la lógica de negocio pura de bases de datos, APIs de LLM externas e interfaces web.
## Decisión
Adoptamos Arquitectura Hexagonal estricta con capas:
- Domain: Entidades puras, Value Objects inmutables y contratos de puertos sin dependencias externas.
- Application: Casos de uso (Use Cases) orquestadores y DTOs de transporte.
- Infrastructure: Adaptadores (node:sqlite, Google Gemini SDK, OpenRouter, Express, Three.js).
## Consecuencias
Inmunidad ante cambios de proveedores cloud o base de datos. Testeabilidad unitaria al 100% sin mocks pesados.`,
    tags: ['hexagonal', 'clean-architecture', 'ddd', 'typescript', 'adr'],
    metadata: { adr_number: 1, author: 'Atenea', status: 'ACCEPTED' }
  },
  {
    id: 'adr-002-value-objects',
    collection: 'adr',
    title: 'ADR-002: Inmutabilidad Absoluta en Value Objects y Entidades DDD',
    content: `# ADR-002: Inmutabilidad Absoluta en Value Objects
## Contexto
La mutación descontrolada de estado en arquitecturas distribuidas genera condiciones de carrera y bugs silenciosos.
## Decisión
Todos los Value Objects en el dominio (Money, Email, UUID, Coordinates) deben ser inmutables por diseño (Object.freeze o propiedades readonly en TypeScript) y validar sus invariantes en el constructor con Result/Either monad.
## Reglas
1. La igualdad se basa en sus atributos, no en su identidad.
2. Cualquier modificación produce una nueva instancia.`,
    tags: ['ddd', 'value-objects', 'inmutabilidad', 'typescript', 'patrones'],
    metadata: { adr_number: 2, author: 'Vulcano', status: 'ACCEPTED' }
  },
  {
    id: 'adr-003-sqlite-nativa',
    collection: 'adr',
    title: 'ADR-003: Persistencia de Ultra Baja Latencia con node:sqlite Nativo',
    content: `# ADR-003: Persistencia con node:sqlite
## Contexto
Depender de compiladores C++ locales (node-gyp, better-sqlite3) o de PostgreSQL externo dificulta la portabilidad multiplataforma en entornos Windows/Linux.
## Decisión
Utilizar el módulo experimental nativo "node:sqlite" de Node.js 24+ con modo WAL (Write-Ahead Logging) activado y Foreign Keys habilitadas.
## Rendimiento
Latencias de lectura inferiores a 0.5ms en memoria local sin requerir Docker ni servidores adicionales.`,
    tags: ['sqlite', 'node24', 'persistencia', 'rendimiento', 'adr'],
    metadata: { adr_number: 3, author: 'A.R.E.S. Prime', status: 'ACCEPTED' }
  },
  {
    id: 'adr-004-supply-chain-ci',
    collection: 'adr',
    title: 'ADR-004: Blindaje contra Supply Chain Attacks en Pipelines de CI/CD',
    content: `# ADR-004: Blindaje de Pipelines CI/CD
## Contexto
Las acciones de GitHub Actions que usan etiquetas mutables (@master o @main) o permisos amplios (write-all) son vulnerables a inyecciones de código malicioso.
## Decisión
1. Pinning de versiones fijas o commit SHAs en todos los 'uses:'.
2. Principio de mínimo privilegio en 'permissions:' (contents: read).
3. Concurrencia con 'cancel-in-progress: true'.
4. Verificación de salud (Healthcheck) post-deploy obligatoria antes de autorizar el tráfico.`,
    tags: ['cicd', 'seguridad', 'owasp', 'github-actions', 'adr'],
    metadata: { adr_number: 4, author: 'Némesis', status: 'ACCEPTED' }
  },
  {
    id: 'code-001-result-monad',
    collection: 'code_snippet',
    title: 'Code Pattern: Result / Either Monad Tipado para Manejo Funcional de Errores',
    content: `export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ success: true, value });
export const fail = <E>(error: E): Result<never, E> => ({ success: false, error });

// Uso en Dominio:
export function crearPrecio(monto: number): Result<Price, string> {
  if (monto < 0) return fail('El monto no puede ser negativo');
  return ok(new Price(monto));
}`,
    tags: ['functional-programming', 'typescript', 'result-pattern', 'error-handling'],
    metadata: { language: 'typescript', solid_score: 98 }
  },
  {
    id: 'sec-001-owasp-sanitization',
    collection: 'security_rule',
    title: 'Security Standard: Directivas OWASP Top 10 para Sanitización en Node.js 24',
    content: `1. Inyección SQL: Uso exclusivo de sentencias preparadas parametrizadas (?, :param) en node:sqlite. Prohibida concatenación de strings.
2. XSS en Sandboxes: El Live Preview debe utilizar iframe con atributo sandbox="allow-scripts allow-modals" sin allow-same-origin para evitar escalado de privilegios.
3. Deserialización Segura: Validar esquemas JSON con parsing defensivo y bloques try/catch sin confiar en inputs externos.
4. Headers HTTP Tácticos: Aplicar CORS estricto y límites de carga de payload (15MB para capturas de visión táctica).`,
    tags: ['owasp', 'seguridad', 'sanitizacion', 'node24', 'sandbox'],
    metadata: { standard: 'OWASP-2026', severity: 'HIGH' }
  }
];

export class MemoryService {
  private static inicializado = false;

  /**
   * Genera un embedding semántico vectorial normalizado (L2) de 128 dimensiones.
   * Utiliza hashing semántico determinista de n-gramas y frecuencia de términos ponderada.
   */
  public static generarEmbeddingLocal(texto: string): number[] {
    const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0);
    if (!texto || texto.trim().length === 0) return vector;

    // Normalizar texto
    const limpio = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .replace(/[^a-z0-9\s_-]/g, ' ');

    const palabras = limpio.split(/\s+/).filter(p => p.length > 2 && !STOPWORDS.has(p));

    if (palabras.length === 0) return vector;

    // Frecuencia de términos y distribución en bins vectoriales
    for (const palabra of palabras) {
      // Hash determinista MD5 de la palabra
      const hash = crypto.createHash('md5').update(palabra).digest();
      const indicePrincipal = hash[0] % VECTOR_DIMENSIONS;
      const indiceSecundario = hash[1] % VECTOR_DIMENSIONS;
      const pesoSigno = (hash[2] % 2 === 0 ? 1 : -1);

      vector[indicePrincipal] += 1.0 * pesoSigno;
      vector[indiceSecundario] += 0.5 * pesoSigno;

      // N-gramas de 3 caracteres para capturar similitud morfológica
      for (let i = 0; i <= palabra.length - 3; i++) {
        const trigram = palabra.substring(i, i + 3);
        const triHash = crypto.createHash('md5').update(trigram).digest()[0] % VECTOR_DIMENSIONS;
        vector[triHash] += 0.25;
      }
    }

    // Normalización L2 (Vector unitario euclidiano)
    let sumaCuadrados = 0;
    for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
      sumaCuadrados += vector[i] * vector[i];
    }

    const magnitud = Math.sqrt(sumaCuadrados);
    if (magnitud > 0) {
      for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
        vector[i] = vector[i] / magnitud;
      }
    }

    return vector;
  }

  /**
   * Calcula la similitud de cosenos entre dos vectores normalizados L2.
   * Rango: 0.0 (totalmente opuestos/ortogonales) a 1.0 (idénticos).
   */
  public static calcularSimilitudCoseno(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let productoPunto = 0;
    for (let i = 0; i < vecA.length; i++) {
      productoPunto += vecA[i] * vecB[i];
    }

    // Normalizado entre 0 y 1 para porcentaje de coincidencia
    const similitud = Math.max(0, Math.min(1, (productoPunto + 1) / 2));
    return parseFloat(similitud.toFixed(4));
  }

  /**
   * Inicializa la base de datos de memoria semántica y siembra las memorias base si está vacía.
   */
  public static async inicializar(): Promise<void> {
    if (this.inicializado) return;

    try {
      inicializarSqlite();
      const res = consultaSqlite<{ count: number }>(
        'SELECT COUNT(*) as count FROM architectural_memories'
      );

      const total = res.rows[0]?.count ?? 0;
      if (total === 0) {
        console.log('🧠 [MemoryService] Sembrando base de conocimiento arquitectónico inicial...');
        for (const semilla of MEMORIAS_SEMILLA) {
          const embedding = this.generarEmbeddingLocal(`${semilla.title} ${semilla.content} ${semilla.tags.join(' ')}`);
          consultaSqlite(
            `INSERT INTO architectural_memories (id, collection, title, content, tags, metadata, embedding, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
              semilla.id,
              semilla.collection,
              semilla.title,
              semilla.content,
              JSON.stringify(semilla.tags),
              JSON.stringify(semilla.metadata),
              JSON.stringify(embedding)
            ]
          );
        }
        console.log(`✅ [MemoryService] ${MEMORIAS_SEMILLA.length} memorias maestras sembradas con éxito.`);
      }

      this.inicializado = true;
    } catch (error) {
      console.error('❌ [MemoryService] Error inicializando memoria vectorial:', error);
    }
  }

  /**
   * Registra una nueva memoria arquitectónica con cálculo de vector.
   */
  public static async guardarMemoria(datos: {
    id?: string;
    collection: MemoryCollection;
    title: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<ArchitecturalMemory> {
    await this.inicializar();

    const id = datos.id || `mem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const tags = datos.tags || [];
    const metadata = datos.metadata || {};
    const textoParaVector = `${datos.title} ${datos.content} ${tags.join(' ')}`;
    const embedding = this.generarEmbeddingLocal(textoParaVector);

    const ahora = new Date().toISOString();

    consultaSqlite(
      `INSERT INTO architectural_memories (id, collection, title, content, tags, metadata, embedding, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         collection = excluded.collection,
         title = excluded.title,
         content = excluded.content,
         tags = excluded.tags,
         metadata = excluded.metadata,
         embedding = excluded.embedding,
         updated_at = excluded.updated_at`,
      [
        id,
        datos.collection,
        datos.title,
        datos.content,
        JSON.stringify(tags),
        JSON.stringify(metadata),
        JSON.stringify(embedding),
        ahora,
        ahora
      ]
    );

    return {
      id,
      collection: datos.collection,
      title: datos.title,
      content: datos.content,
      tags,
      metadata,
      embedding,
      created_at: ahora,
      updated_at: ahora
    };
  }

  /**
   * Ejecuta búsqueda semántica vectorial por similitud de cosenos.
   */
  public static async buscarSemantica(
    query: string,
    umbralSimilitud: number = 0.55,
    limite: number = 5,
    coleccion?: MemoryCollection
  ): Promise<SearchResult> {
    await this.inicializar();
    const tInicio = performance.now();

    const vectorQuery = this.generarEmbeddingLocal(query);

    let sql = 'SELECT id, collection, title, content, tags, metadata, embedding, created_at, updated_at FROM architectural_memories';
    const params: any[] = [];

    if (coleccion) {
      sql += ' WHERE collection = ?';
      params.push(coleccion);
    }

    const res = consultaSqlite<any>(sql, params);
    const filas = res.rows;
    const candidatos: ArchitecturalMemory[] = [];

    for (const fila of filas) {
      let vectorFila: number[] = [];
      try {
        vectorFila = typeof fila.embedding === 'string' ? JSON.parse(fila.embedding) : fila.embedding;
      } catch {
        continue;
      }

      const score = this.calcularSimilitudCoseno(vectorQuery, vectorFila);

      if (score >= umbralSimilitud) {
        let tags: string[] = [];
        let metadata: Record<string, any> = {};
        try {
          tags = typeof fila.tags === 'string' ? JSON.parse(fila.tags) : fila.tags;
        } catch { /* ignorar */ }
        try {
          metadata = typeof fila.metadata === 'string' ? JSON.parse(fila.metadata) : fila.metadata;
        } catch { /* ignorar */ }

        candidatos.push({
          id: fila.id,
          collection: fila.collection,
          title: fila.title,
          content: fila.content,
          tags,
          metadata,
          similarityScore: score,
          created_at: fila.created_at,
          updated_at: fila.updated_at
        });
      }
    }

    // Ordenar de mayor a menor similitud
    candidatos.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
    const resultados = candidatos.slice(0, limite);
    const tFin = performance.now();

    return {
      query,
      totalEncontrados: resultados.length,
      resultados,
      tiempoBusquedaMs: parseFloat((tFin - tInicio).toFixed(2))
    };
  }

  /**
   * RAG Helper: Recupera contexto arquitectónico relevante para inyectar en prompts del LLM.
   */
  public static async recuperarContextoRAG(prompt: string, minScore: number = 0.65): Promise<string | null> {
    const busqueda = await this.buscarSemantica(prompt, minScore, 2);
    if (busqueda.resultados.length === 0) return null;

    let contexto = '\n\n[🏛️ MEMORIA ARQUITECTÓNICA VECTORIAL RECUPERADA (RAG TÁCTICO)]:\n';
    for (const res of busqueda.resultados) {
      const matchPct = Math.round((res.similarityScore || 0) * 100);
      contexto += `• [${res.collection.toUpperCase()}] ${res.title} (Coincidencia: ${matchPct}%):\n`;
      contexto += `  "${res.content.replace(/\n+/g, ' ').slice(0, 320)}..."\n\n`;
    }

    return contexto;
  }

  /**
   * Lista todas las memorias guardadas.
   */
  public static async listarMemorias(coleccion?: MemoryCollection): Promise<ArchitecturalMemory[]> {
    await this.inicializar();
    let sql = 'SELECT id, collection, title, content, tags, metadata, created_at, updated_at FROM architectural_memories';
    const params: any[] = [];

    if (coleccion) {
      sql += ' WHERE collection = ?';
      params.push(coleccion);
    }

    sql += ' ORDER BY updated_at DESC';
    const res = consultaSqlite<any>(sql, params);
    const filas = res.rows;

    return filas.map((f: any) => {
      let tags: string[] = [];
      let metadata: Record<string, any> = {};
      try { tags = typeof f.tags === 'string' ? JSON.parse(f.tags) : f.tags; } catch {}
      try { metadata = typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata; } catch {}

      return {
        id: f.id,
        collection: f.collection,
        title: f.title,
        content: f.content,
        tags,
        metadata,
        created_at: f.created_at,
        updated_at: f.updated_at
      };
    });
  }

  /**
   * Elimina una memoria por ID.
   */
  public static async eliminarMemoria(id: string): Promise<boolean> {
    await this.inicializar();
    consultaSqlite('DELETE FROM architectural_memories WHERE id = ?', [id]);
    return true;
  }

  /**
   * Obtiene telemetría y métricas del oráculo de memoria.
   */
  public static async obtenerEstadisticas(): Promise<MemoryStats> {
    await this.inicializar();
    const memorias = await this.listarMemorias();

    const porColeccion: Record<string, number> = {};
    const tagsUnicos = new Set<string>();

    for (const m of memorias) {
      porColeccion[m.collection] = (porColeccion[m.collection] || 0) + 1;
      for (const t of m.tags) {
        tagsUnicos.add(t);
      }
    }

    return {
      totalMemorias: memorias.length,
      dimensionVectorial: VECTOR_DIMENSIONS,
      porColeccion,
      totalTags: tagsUnicos.size,
      ultimaActualizacion: memorias[0]?.updated_at || new Date().toISOString()
    };
  }
}
