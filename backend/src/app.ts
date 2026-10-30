/**
 * @fileoverview Servidor principal Express del ecosistema A.R.E.S.
 * Configura middlewares, rutas tácticas de la API y manejo centralizado de errores.
 * @module app
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { verificarConexionDB } from './config/db.js';
import { verificarConexionRedis } from './config/redis.js';
import { chatHandler, chatStreamHandler } from './controllers/chat.controller.js';
import { generarDocumentoHandler, listarDocumentosHandler } from './controllers/documents.controller.js';
import { auditarCodigoHandler, generarPruebasHandler, listarAuditoriasHandler, auditarRepositorioGitHubHandler } from './controllers/audit.controller.js';
import { obtenerEstadoBioHandler, obtenerUltimaTelemetriaHandler } from './controllers/bio.controller.js';
import { obtenerChangelogHandler, guardarChangelogHandler } from './controllers/changelog.controller.js';
import {
  listarConversacionesHandler,
  obtenerMensajesConversacionHandler,
  crearConversacionHandler,
  eliminarConversacionHandler,
} from './controllers/conversations.controller.js';
import {
  listarRepositoriosHandler,
  obtenerRepositorioActivoHandler,
} from './controllers/repositories.controller.js';
import {
  listarAgentesSwarmHandler,
  ejecutarSwarmHandler,
  ejecutarSwarmStreamHandler,
} from './controllers/swarm.controller.js';
import {
  listarTemplatesHandler,
  obtenerTemplateHandler,
  auditarWorkflowHandler,
  obtenerEstadoPipelineHandler,
  ejecutarPipelineSimulacionHandler,
  ejecutarPipelineStreamHandler,
} from './controllers/cicd.controller.js';
import {
  listarMemoriasHandler,
  guardarMemoriaHandler,
  buscarSemanticaHandler,
  eliminarMemoriaHandler,
  obtenerEstadisticasHandler,
} from './controllers/memory.controller.js';
import {
  listarTopologiasHandler,
  obtenerTopologiaHandler,
  simularTraficoHandler,
  inyectarCaosHandler,
  restaurarTopologiaHandler,
  exportarC4Handler,
} from './controllers/architecture.controller.js';
import {
  cleanTextHandler,
  forgeAssignmentHandler,
  executeGitHandler,
  listStacksHandler,
} from './controllers/assignment.controller.js';
import {
  runBenchmarkHandler,
  generateBenchmarkFilesHandler,
  listBenchmarkPresetsHandler,
} from './controllers/benchmark.controller.js';
import { MemoryService } from './services/memory.service.js';
import { CATALOGO_MODELOS } from './services/llm.service.js';
import { AiRouterService } from './services/ai-router.service.js';
import { ejecutarHerramienta, DECLARACIONES_HERRAMIENTAS } from './services/tools.service.js';
import { manejadorErrores, ValidationError } from './middleware/error.middleware.js';
import { crearMiddlewareApiKey } from './middleware/auth.middleware.js';
import { cerrarSqlite } from './config/sqlite.js';
import { VERSION } from './config/version.js';

const app = express();

// ============================================================================
// Middlewares Globales
// ============================================================================

// Detrás de un proxy (Render, nginx) hay que decir cuántos saltos son de confianza
// para que el límite de peticiones use la IP real del cliente.
if (env.TRUST_PROXY_HOPS > 0) app.set('trust proxy', env.TRUST_PROXY_HOPS);

// Cabeceras de seguridad HTTP
app.use(helmet());

// CORS con lista blanca. Ojo: CORS solo protege a los NAVEGADORES; la protección real es la API key.
const origenesPermitidos = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin(origen, cb) {
      if (!origen) return cb(null, true); // curl, CLI, MCP: no envían Origin
      if (origenesPermitidos.includes('*')) return cb(null, true); // solo posible en desarrollo (env.ts lo prohíbe en producción)
      return cb(null, origenesPermitidos.includes(origen));
    },
  })
);

// Límite de peticiones: general y más estricto para rutas que consumen IA
const limiteGeneral = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
const limiteIA = rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false });
app.use('/api', limiteGeneral);
app.use(['/api/chat', '/api/swarm', '/api/audit', '/api/documents', '/api/tests', '/api/benchmark'], limiteIA);

// Acceso por API key a TODA la API (/health queda público). Va ANTES de leer el body.
app.use(
  '/api',
  crearMiddlewareApiKey({
    claveEsperada: env.ARES_API_KEY,
    produccion: env.NODE_ENV === 'production',
    origenesPermitidos,
  })
);

// Parsear payloads JSON (15MB para capturas en base64; solo llega aquí quien ya pasó la API key)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ============================================================================
// Rutas Tácticas de la API
// ============================================================================

// Verificación de estado del servidor (Healthcheck)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    agent: `A.R.E.S. v${VERSION} Sovereign Industrial Release`,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// 1. Chat Táctico Multimodal (Oráculo de Arquitectura + Grounding)
app.post('/api/chat', chatHandler);
app.post('/api/chat/stream', chatStreamHandler);
app.get('/api/models', (_req, res) => {
  res.status(200).json({ models: CATALOGO_MODELOS });
});

// 1.0 Enrutador Adaptativo & Conmutador Automático de IA (v3.9)
app.post('/api/models/route', (req, res) => {
  const { prompt, hasImage } = req.body ?? {};
  if (prompt !== undefined && typeof prompt !== 'string') {
    throw new ValidationError('El campo "prompt" debe ser texto.');
  }
  const decision = AiRouterService.clasificarYEnrutar(prompt || '', Boolean(hasImage));
  res.status(200).json({
    success: true,
    decision,
  });
});

// 1.1 Enjambre de Subagentes Especializados (Multi-Agent Swarm v3.1)
app.get('/api/swarm/agents', listarAgentesSwarmHandler);
app.post('/api/swarm/execute', ejecutarSwarmHandler);
app.post('/api/swarm/stream', ejecutarSwarmStreamHandler);

// 1.2 Motor de CI/CD & Despliegues Autónomos (v3.2)
app.get('/api/cicd/templates', listarTemplatesHandler);
app.get('/api/cicd/templates/:id', obtenerTemplateHandler);
app.post('/api/cicd/audit', auditarWorkflowHandler);
app.get('/api/cicd/status', obtenerEstadoPipelineHandler);
app.post('/api/cicd/simulate', ejecutarPipelineSimulacionHandler);
app.get('/api/cicd/simulate/stream', ejecutarPipelineStreamHandler);

// 1.3 Oráculo de Memoria Semántica Vectorial Local & RAG (v3.3)
app.get('/api/memory', listarMemoriasHandler);
app.post('/api/memory', guardarMemoriaHandler);
app.post('/api/memory/search', buscarSemanticaHandler);
app.delete('/api/memory/:id', eliminarMemoriaHandler);
app.get('/api/memory/stats', obtenerEstadisticasHandler);

// 1.4 Radar de Arquitectura de Sistemas C4 & Tracing de Eventos (v3.4)
app.get('/api/architecture/topologies', listarTopologiasHandler);
app.get('/api/architecture/topology', obtenerTopologiaHandler);
app.get('/api/architecture/topology/:id', obtenerTopologiaHandler);
app.post('/api/architecture/simulate-traffic', simularTraficoHandler);
app.post('/api/architecture/inject-chaos', inyectarCaosHandler);
app.post('/api/architecture/restore', restaurarTopologiaHandler);
app.get('/api/architecture/export/c4', exportarC4Handler);

// 1.5 Forja Soberana de Ejercicios & Autómata Git DDD (v3.5)
app.post('/api/assignment/clean-text', cleanTextHandler);
app.post('/api/assignment/forge', forgeAssignmentHandler);
app.post('/api/assignment/execute-git', executeGitHandler);
app.get('/api/assignment/stacks', listStacksHandler);

// 1.6 Suite de Pruebas E2E, Mutación Stryker & Benchmarks k6 (v3.8)
app.post('/api/benchmark/run', runBenchmarkHandler);
app.post('/api/benchmark/generate', generateBenchmarkFilesHandler);
app.get('/api/benchmark/presets', listBenchmarkPresetsHandler);

// 1.1 Persistencia y Sesiones de Chat (Memoria Total)
app.get('/api/conversations', listarConversacionesHandler);
app.post('/api/conversations', crearConversacionHandler);
app.get('/api/conversations/:id/messages', obtenerMensajesConversacionHandler);
app.delete('/api/conversations/:id', eliminarConversacionHandler);

// 1.2 Proyectos y Repositorios Protegidos
app.get('/api/repositories', listarRepositoriosHandler);
app.get('/api/repositories/active', obtenerRepositorioActivoHandler);

// 2. Escudo Aegis: Generación de Documentación (README, ADR, OpenAPI, RFC, Mermaid)
app.post('/api/documents/generate', generarDocumentoHandler);
app.get('/api/documents/:repositoryId', listarDocumentosHandler);

// 3. Espada Binaria: Auditoría SOLID, Big-O y Refactorización OWASP
app.post('/api/audit', auditarCodigoHandler);
app.post('/api/audit/github', auditarRepositorioGitHubHandler);
app.get('/api/audit/:repositoryId', listarAuditoriasHandler);
app.post('/api/tests/generate', generarPruebasHandler);

// 4. Catálogo y Ejecución de Function Calling (Herramientas Estructuradas)
app.get('/api/tools', (_req, res) => {
  res.status(200).json({ tools: DECLARACIONES_HERRAMIENTAS });
});
app.post('/api/tools/execute', async (req, res, next) => {
  try {
    const { toolName, args } = req.body ?? {};
    if (typeof toolName !== 'string' || !DECLARACIONES_HERRAMIENTAS.some((h) => h.name === toolName)) {
      throw new ValidationError(`toolName inválido. Disponibles: ${DECLARACIONES_HERRAMIENTAS.map((h) => h.name).join(', ')}`);
    }
    const resultado = await ejecutarHerramienta(toolName, args || {});
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
});

// 4. Protocolo Bio-Armadura: Telemetría y Bienestar
app.get('/api/bio/:commanderId', obtenerEstadoBioHandler);
app.get('/api/bio/:commanderId/latest', obtenerUltimaTelemetriaHandler);

// 5. Generador Automático de CHANGELOG y Cálculo SemVer
app.get('/api/changelog', obtenerChangelogHandler);
app.post('/api/changelog/generate', guardarChangelogHandler);

// ============================================================================
// Manejador Global de Errores
// ============================================================================
app.use(manejadorErrores);

// ============================================================================
// Inicialización del Servidor
// ============================================================================
async function iniciarServidor(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🛡️  INICIALIZANDO SISTEMA TÁCTICO A.R.E.S. v${VERSION}...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Inicializar Oráculo de Memoria Semántica Vectorial Local
  try {
    await MemoryService.inicializar();
    console.log('🧠 [Memoria Vectorial] Oráculo de conocimiento arquitectónico sincronizado.');
  } catch (err) {
    console.warn('⚠️  [Aviso] No se pudo inicializar la memoria vectorial local:', err);
  }

  // Intentar conectar a PostgreSQL
  try {
    await verificarConexionDB();
  } catch (error) {
    console.warn('⚠️  [Aviso] PostgreSQL no está disponible en este momento.');
    console.warn('    El servidor continuará en modo degradado (sesión en memoria temporal).');
    console.warn('    Para iniciar la base de datos: docker compose up -d');
  }

  // Intentar conectar a Redis
  try {
    await verificarConexionRedis();
  } catch (error) {
    console.warn('⚠️  [Aviso] Redis no está disponible. Modo en memoria activo.');
  }

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 [A.R.E.S.] Servidor API escuchando en el puerto ${env.PORT} (0.0.0.0)`);
    console.log(`📡 [Health] http://localhost:${env.PORT}/health`);
    console.log(`⚔️  [Consola] Listo para recibir órdenes tácticas del Comandante.`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
}

function apagar(senal: string): void {
  console.log(`🛑 [A.R.E.S.] ${senal} recibido: cerrando de forma ordenada...`);
  cerrarSqlite();
  process.exit(0);
}
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));

iniciarServidor().catch((error) => {
  console.error('💥 Falla crítica al arrancar el servidor A.R.E.S.:', error);
  process.exit(1);
});

export default app;
