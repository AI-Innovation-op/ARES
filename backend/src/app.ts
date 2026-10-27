/**
 * @fileoverview Servidor principal Express del ecosistema A.R.E.S.
 * Configura middlewares, rutas tácticas de la API y manejo centralizado de errores.
 * @module app
 */

import express from 'express';
import cors from 'cors';
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
import { CATALOGO_MODELOS } from './services/llm.service.js';
import { ejecutarHerramienta, DECLARACIONES_HERRAMIENTAS } from './services/tools.service.js';
import { manejadorErrores } from './middleware/error.middleware.js';

const app = express();

// ============================================================================
// Middlewares Globales
// ============================================================================

// Habilitar CORS para permitir conexión con Vite (localhost:5173 u otro origen)
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : [env.CORS_ORIGIN, 'http://localhost:5173'],
    credentials: true,
  })
);

// Parsear payloads JSON (límite ampliado a 15MB para soportar capturas de pantalla tácticas en base64)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ============================================================================
// Rutas Tácticas de la API
// ============================================================================

// Verificación de estado del servidor (Healthcheck)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    agent: 'A.R.E.S. v3.1 Sovereign Swarm Core',
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

// 1.1 Enjambre de Subagentes Especializados (Multi-Agent Swarm v3.1)
app.get('/api/swarm/agents', listarAgentesSwarmHandler);
app.post('/api/swarm/execute', ejecutarSwarmHandler);
app.post('/api/swarm/stream', ejecutarSwarmStreamHandler);

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
    const { toolName, args } = req.body;
    if (!toolName) {
      res.status(400).json({ error: 'El campo toolName es obligatorio.' });
      return;
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
  console.log('🛡️  INICIALIZANDO SISTEMA TÁCTICO A.R.E.S. v3.1 (SOVEREIGN SWARM)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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

iniciarServidor().catch((error) => {
  console.error('💥 Falla crítica al arrancar el servidor A.R.E.S.:', error);
  process.exit(1);
});

export default app;
