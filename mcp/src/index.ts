#!/usr/bin/env node

/**
 * @fileoverview Servidor MCP (Model Context Protocol) Nativo para A.R.E.S. v2.6.
 * Expone herramientas de ingeniería táctica (Auditoría, Documentación, Tests y Bio)
 * a clientes MCP como Claude Desktop, Cursor, Antigravity y VS Code.
 * @module mcp/index
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Cargar variables de entorno
const posiblesEnv = [
  path.resolve(process.cwd(), '.env'),
  path.resolve('D:/ares-ecosystem/backend/.env'),
  path.resolve('D:/ares-ecosystem/.env'),
];

for (const p of posiblesEnv) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const API_BASE = process.env.ARES_API_URL || 'http://localhost:3000';

const server = new McpServer({
  name: 'ares-tactical-mcp',
  version: '2.6.0',
});

// Helper para llamadas al Backend de A.R.E.S.
async function callAresApi(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`A.R.E.S. API (${res.status}): ${errorText}`);
  }
  return res.json();
}

// ============================================================================
// 1. HERRAMIENTA: ares_audit_code (Espada Binaria)
// ============================================================================
server.tool(
  'ares_audit_code',
  {
    language: z.string().describe('Lenguaje de programación (TypeScript, Python, etc.)'),
    code: z.string().describe('Código fuente a auditar, medir y refactorizar'),
  },
  async ({ language, code }) => {
    try {
      const data = (await callAresApi('/api/audit', 'POST', { language, code })) as any;

      let metricsText = '';
      if (data.metrics) {
        metricsText = `\n\n[MÉTRICAS TÁCTICAS]\n- Big-O: ${data.metrics.bigO_antes} ➔ ${data.metrics.bigO_despues}\n- SOLID: ${data.metrics.solid_antes}/100 ➔ ${data.metrics.solid_despues}/100\n- Seguridad: ${data.metrics.seguridad_antes} ➔ ${data.metrics.seguridad_despues}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `⚔️ **AUDITORÍA DE LA ESPADA BINARIA (A.R.E.S. v2.6)**${metricsText}\n\n### Diagnóstico:\n${data.analysis}\n\n### Código Refactorizado:\n\`\`\`${language}\n${data.refactoredCode}\n\`\`\``,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Error en auditoría A.R.E.S.: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// 2. HERRAMIENTA: ares_forge_documentation (Escudo Aegis)
// ============================================================================
server.tool(
  'ares_forge_documentation',
  {
    docType: z
      .enum(['README', 'ADR', 'RFC', 'OPENAPI', 'MERMAID_C4', 'DOCSTRINGS'])
      .describe('Tipo de documento industrial a forjar'),
    sourceContext: z.string().describe('Contexto del proyecto, código o decisión técnica a documentar'),
    title: z.string().optional().describe('Título formal del documento (ej: ADR-001: Arquitectura Limpia)'),
  },
  async ({ docType, sourceContext, title }) => {
    try {
      const data = (await callAresApi('/api/documents/generate', 'POST', {
        docType,
        sourceContext,
        title,
      })) as any;

      return {
        content: [
          {
            type: 'text',
            text: `🛡️ **ARTEFACTO FORJADO: ${data.title}**\n\n${data.markdownContent}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Error al forjar documento: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// 3. HERRAMIENTA: ares_forge_tests (Test Forge)
// ============================================================================
server.tool(
  'ares_forge_tests',
  {
    code: z.string().describe('Código fuente que requiere blindaje de pruebas unitarias'),
    language: z.string().describe('Lenguaje de programación del código'),
    framework: z
      .enum(['vitest', 'jest', 'pytest', 'gotest'])
      .describe('Framework de pruebas unitarias a generar'),
    focus: z.string().optional().describe('Enfoque específico (ej: casos borde y concurrencia)'),
  },
  async ({ code, language, framework, focus }) => {
    try {
      const data = (await callAresApi('/api/tests/generate', 'POST', {
        code,
        language,
        framework,
        focus,
      })) as any;

      return {
        content: [
          {
            type: 'text',
            text: `🧪 **TEST FORGE TÁCTICO (${framework.toUpperCase()})**\n\n**Resumen:** ${data.summary}\n\n\`\`\`${language}\n${data.testCode}\n\`\`\``,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Error al forjar pruebas: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// 4. HERRAMIENTA: ares_bio_telemetry (Protocolo Bio-Armadura)
// ============================================================================
server.tool('ares_bio_telemetry', {}, async () => {
  try {
    const bio = (await callAresApi('/api/bio/default')) as any;

    return {
      content: [
        {
          type: 'text',
          text: `❤️‍🩹 **TELEMETRÍA BIO-ARMADURA A.R.E.S.**\n- Estamina: ${bio.estaminaPct}%\n- Hidratación: ${bio.aguaPct}%\n- Minutos de Sesión: ${bio.minutosSesion} min\n- Nivel de Fatiga: ${bio.nivelFatiga}\n- Intervención Requerida: ${bio.requiereIntervencion ? 'SÍ (' + bio.mensajeIntervencion + ')' : 'NO (Zona Segura)'}`,
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: 'text',
          text: `⚠️ Error consultando telemetría bio: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// 5. HERRAMIENTA: ares_ask (Chat Táctico Multi-Modelo)
// ============================================================================
server.tool(
  'ares_ask',
  {
    message: z.string().describe('Orden o pregunta técnica para el dios guerrero A.R.E.S.'),
    model: z.string().optional().describe('Modelo a consultar (deepseek/deepseek-chat, gemini-3-flash-preview, etc.)'),
    provider: z.enum(['gemini', 'openrouter']).optional().describe('Proveedor de IA'),
  },
  async ({ message, model, provider }) => {
    try {
      const data = (await callAresApi('/api/chat', 'POST', {
        message,
        model,
        provider,
      })) as any;

      return {
        content: [
          {
            type: 'text',
            text: `${data.reply}\n\n[Postura: ${data.stance} | Pose: ${data.poseNumber} | Modelo: ${data.model || 'default'}]`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Error en consulta táctica: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// 6. HERRAMIENTA: ares_generate_changelog (Generador SemVer)
// ============================================================================
server.tool(
  'ares_generate_changelog',
  {
    version: z.string().optional().describe('Versión SemVer sugerida o manual (ej: 2.7.0)'),
    write: z.boolean().optional().describe('Si es true, actualiza el archivo CHANGELOG.md en disco'),
  },
  async ({ version, write }) => {
    try {
      const data = (await callAresApi('/api/changelog/generate', 'POST', {
        version,
        write: Boolean(write),
      })) as any;

      return {
        content: [
          {
            type: 'text',
            text: `📜 **CHANGELOG GENERADO (SemVer: ${data.versionCalculada})**\n\n${data.markdown}${data.saved ? '\n\n💾 Guardado en: ' + data.savedPath : ''}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Error al generar changelog: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// 7. HERRAMIENTA: ares_spartan_status (Pre-Push & Bio Guardian)
// ============================================================================
server.tool('ares_spartan_status', {}, async () => {
  try {
    const hora = new Date().getHours();
    const esNocturno = hora >= 1 && hora < 5;
    const bio = (await callAresApi('/api/bio/default')) as any;

    const estadoDeploy = esNocturno && bio.estaminaPct < 40 ? 'BLOQUEADO' : 'AUTORIZADO';

    return {
      content: [
        {
          type: 'text',
          text: `🛡️ **GUARDIÁN ESPARTANO PRE-PUSH**\n- Hora actual: ${hora}:00 hrs (${esNocturno ? 'Ventana Nocturna Crítica 01:00-05:00' : 'Ventana Diurna Segura'})\n- Estamina: ${bio.estaminaPct}%\n- Fatiga: ${bio.nivelFatiga}\n- Estado de Despliegue Git: ${estadoDeploy}\n${estadoDeploy === 'BLOQUEADO' ? '⚠️ ADVERTENCIA: El pre-push hook bloqueará git push para proteger la producción.' : '✅ Despliegues permitidos.'}`,
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: 'text',
          text: `⚠️ Error consultando estado espartano: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Iniciar servidor sobre transporte Stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('💥 Error crítico en Servidor MCP A.R.E.S.:', err);
  process.exit(1);
});
