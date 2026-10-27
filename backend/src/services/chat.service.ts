/**
 * @fileoverview Servicio de orquestación del chat táctico de A.R.E.S.
 * Clasifica la intención, gestiona turnos conversacionales y deriva posturas.
 * @module services/chat.service
 */

import { invocarLLM, invocarLLMStream } from './llm.service.js';
import {
  crearConversacion,
  obtenerConversacionPorId,
} from '../repositories/conversations.repo.js';
import {
  guardarMensaje,
  obtenerUltimosMensajes,
} from '../repositories/messages.repo.js';
import { obtenerOCrearComandantePorDefecto } from '../repositories/commanders.repo.js';
import type {
  Postura,
  NumeroPose,
  IntencionUsuario,
} from '../types/ares.types.js';
import type { ChatRequest, ChatResponse } from '../types/api.types.js';
import type { ContenidoGemini } from '../types/gemini.types.js';

/**
 * Palabras clave para la detección de fatiga (Protocolo Bio-Armadura).
 */
const PALABRAS_FATIGA = [
  'cansad',
  'agotad',
  'desvel',
  'sin dormir',
  'madrugada',
  'duelen los ojos',
  'dolor de cabeza',
  'dolor de espalda',
  'burnout',
  'estrés',
  'sin parar',
];

/**
 * Clasifica la intención táctica a partir del texto del comandante.
 */
export function clasificarIntencion(mensaje: string): IntencionUsuario {
  const minusculas = mensaje.toLowerCase();

  // 1. Prioridad absoluta: fatiga y bienestar (Herencia de Cori)
  for (const p of PALABRAS_FATIGA) {
    if (minusculas.includes(p)) {
      return 'FATIGUE';
    }
  }

  // Comprobar patrón de muchas horas ("5 horas", "6 horas sin parar", etc.)
  if (/\b(?:[5-9]|1[0-9])\s*(?:horas|hrs)/.test(minusculas) && 
      /(?:program|trabaj|codific|frente|pantalla)/.test(minusculas)) {
    return 'FATIGUE';
  }

  // 2. Prioridad de combate / calidad: bugs, refactor, errores
  const palabrasCombate = ['bug', 'error', 'refactor', 'lento', 'optimiz', 'falla', 'crash', 'excepci'];
  if (palabrasCombate.some(k => minusculas.includes(k))) {
    return 'SLASH';
  }

  // 3. Prioridad documental: docs, readme, adr, openapi
  const palabrasDoc = ['doc', 'documenta', 'readme', 'adr', 'openapi', 'swagger', 'rfc'];
  if (palabrasDoc.some(k => minusculas.includes(k))) {
    return 'SHIELD';
  }

  // 4. Por defecto: sprint general
  return 'SPRINT';
}

/**
 * Determina la postura y la pose del avatar según la intención.
 */
export function derivarPosturaYPose(intencion: IntencionUsuario): {
  stance: Postura;
  poseNumber: NumeroPose;
} {
  switch (intencion) {
    case 'FATIGUE':
      return { stance: 'SHIELD', poseNumber: 14 }; // Blindaje Bio-Armadura
    case 'SLASH':
      return { stance: 'SLASH', poseNumber: 11 };  // Corte Anime Binario
    case 'SHIELD':
      return { stance: 'SHIELD', poseNumber: 15 }; // Santuario Documental
    case 'SPRINT':
    default:
      return { stance: 'SPRINT', poseNumber: 6 };  // Sprint de Emergencia
  }
}

/**
 * Procesa un mensaje del comandante en el chat de A.R.E.S.
 */
export async function procesarMensajeChat(request: ChatRequest): Promise<ChatResponse> {
  const { message, conversationId, imageBase64, commanderId, provider, model, tacticalMode } = request;

  let idConversacion = conversationId;

  // Manejo de persistencia con tolerancia a fallas si PostgreSQL no está levantado aún
  let comandanteId = commanderId;
  try {
    if (!comandanteId) {
      const comandante = await obtenerOCrearComandantePorDefecto();
      comandanteId = comandante.id;
    }

    if (!idConversacion) {
      const nueva = await crearConversacion(comandanteId);
      idConversacion = nueva.id;
    } else {
      const existente = await obtenerConversacionPorId(idConversacion);
      if (!existente) {
        const nueva = await crearConversacion(comandanteId);
        idConversacion = nueva.id;
      }
    }
  } catch (error) {
    console.warn('⚠️ [ChatService] Base de datos no disponible, usando sesión en memoria temporal:', error);
    idConversacion = idConversacion ?? 'conv-memoria-temp';
  }

  // Determinar intención y postura inicial
  const intencion = clasificarIntencion(message);
  const { stance, poseNumber } = derivarPosturaYPose(intencion);

  // Cargar historial previo de la conversación si es posible
  const historialTurnos: ContenidoGemini[] = [];
  try {
    if (idConversacion !== 'conv-memoria-temp') {
      const mensajesPrevios = await obtenerUltimosMensajes(idConversacion, 14);
      for (const m of mensajesPrevios) {
        historialTurnos.push({
          role: m.role,
          parts: [{ text: m.content }],
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ [ChatService] No se pudo leer historial previo:', err);
  }

  // Directivas de Modos Tácticos y Detección de GitHub (v2.9)
  let textoFinalMensaje = message;
  let directivaTactico = '';

  if (tacticalMode === 'centinela') {
    directivaTactico += '[MODO TÁCTICO ACTIVO: 🛡️ CENTINELA (AUDITOR Y SEGURIDAD MÁXIMA) - Exige rigor extremo, OWASP, DDD, SOLID y tipado estricto]\n';
  } else if (tacticalMode === 'blitzkrieg') {
    directivaTactico += '[MODO TÁCTICO ACTIVO: ⚡ BLITZKRIEG (PROTOTIPADO RÁPIDO) - Prioriza interfaces visuales completas, código funcional para Live Preview inmediato y agilidad]\n';
  } else if (tacticalMode === 'arquitecto') {
    directivaTactico += '[MODO TÁCTICO ACTIVO: 🏛️ ARQUITECTO (ESTRATEGIA & RFC) - Estructura decisiones en RFCs maestros, diagramas C4 Mermaid y arquitectura de sistemas]\n';
  }

  const matchGithub = message.match(/https:\/\/github\.com\/[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+/i);
  if (matchGithub) {
    directivaTactico += `[DETECCIÓN DE REPOSITORIO GITHUB: El Comandante proporcionó ${matchGithub[0]}. Si solicita auditarlo, analiza su arquitectura, diagramas C4 y seguridad.]\n`;
  }

  if (directivaTactico) {
    textoFinalMensaje = `${directivaTactico}\n${message}`;
  }

  // Construir el turno actual del usuario (incluyendo imagen si se adjuntó)
  const partesActuales: any[] = [{ text: textoFinalMensaje }];
  if (imageBase64) {
    partesActuales.unshift({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  historialTurnos.push({
    role: 'user',
    parts: partesActuales,
  });

  // Invocar al motor Multi-Modelo (Gemini / OpenRouter con failover automático)
  const respuesta = await invocarLLM({
    contents: historialTurnos,
    enableSearch: !imageBase64,
    provider,
    model,
  });

  // Guardar mensajes en la base de datos si está disponible
  try {
    if (idConversacion !== 'conv-memoria-temp') {
      await guardarMensaje(idConversacion, 'user', message);
      await guardarMensaje(
        idConversacion,
        'model',
        respuesta.texto,
        respuesta.fuentes,
        poseNumber
      );
    }
  } catch (err) {
    console.warn('⚠️ [ChatService] No se pudieron guardar mensajes en la base de datos:', err);
  }

  return {
    reply: respuesta.texto,
    stance,
    poseNumber,
    conversationId: idConversacion,
    sources: respuesta.fuentes,
    provider: respuesta.proveedorUsado,
    model: respuesta.modeloUsado,
  };
}

/**
 * Extrae el número de pose (1-16) declarado en el texto de A.R.E.S.
 */
export function extraerPoseDeTexto(texto: string): NumeroPose | null {
  const match = texto.match(/POSE\s+(\d+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 16) {
      return num as NumeroPose;
    }
  }
  return null;
}

/**
 * Eventos emitidos durante el streaming de chat.
 */
export type EventoStreamChat =
  | { type: 'init'; stance: Postura; poseNumber: NumeroPose; conversationId: string }
  | { type: 'chunk'; text: string; poseDetected?: NumeroPose }
  | { type: 'done'; reply: string; stance: Postura; poseNumber: NumeroPose; conversationId: string };

/**
 * Procesa un mensaje de chat emitiendo tokens en tiempo real mediante SSE.
 */
export async function* procesarMensajeChatStream(
  request: ChatRequest
): AsyncGenerator<EventoStreamChat> {
  const { message, conversationId, imageBase64, commanderId, provider, model, tacticalMode } = request;

  let idConversacion = conversationId;
  let comandanteId = commanderId;
  try {
    if (!comandanteId) {
      const comandante = await obtenerOCrearComandantePorDefecto();
      comandanteId = comandante.id;
    }

    if (!idConversacion) {
      const nueva = await crearConversacion(comandanteId);
      idConversacion = nueva.id;
    } else {
      const existente = await obtenerConversacionPorId(idConversacion);
      if (!existente) {
        const nueva = await crearConversacion(comandanteId);
        idConversacion = nueva.id;
      }
    }
  } catch (error) {
    idConversacion = idConversacion ?? 'conv-memoria-temp';
  }

  // Intención inicial
  const intencion = clasificarIntencion(message);
  let { stance, poseNumber } = derivarPosturaYPose(intencion);

  // Emitir evento inicial
  yield {
    type: 'init',
    stance,
    poseNumber,
    conversationId: idConversacion,
  };

  // Historial previo
  const historialTurnos: ContenidoGemini[] = [];
  try {
    if (idConversacion !== 'conv-memoria-temp') {
      const mensajesPrevios = await obtenerUltimosMensajes(idConversacion, 14);
      for (const m of mensajesPrevios) {
        historialTurnos.push({
          role: m.role,
          parts: [{ text: m.content }],
        });
      }
    }
  } catch (err) {
    // Modo tolerante
  }

  // Directivas de Modos Tácticos y Detección de GitHub (v2.9)
  let textoFinalMensaje = message;
  let directivaTactico = '';

  if (tacticalMode === 'centinela') {
    directivaTactico += '[MODO TÁCTICO ACTIVO: 🛡️ CENTINELA (AUDITOR Y SEGURIDAD MÁXIMA) - Exige rigor extremo, OWASP, DDD, SOLID y tipado estricto]\n';
  } else if (tacticalMode === 'blitzkrieg') {
    directivaTactico += '[MODO TÁCTICO ACTIVO: ⚡ BLITZKRIEG (PROTOTIPADO RÁPIDO) - Prioriza interfaces visuales completas, código funcional para Live Preview inmediato y agilidad]\n';
  } else if (tacticalMode === 'arquitecto') {
    directivaTactico += '[MODO TÁCTICO ACTIVO: 🏛️ ARQUITECTO (ESTRATEGIA & RFC) - Estructura decisiones en RFCs maestros, diagramas C4 Mermaid y arquitectura de sistemas]\n';
  }

  const matchGithub = message.match(/https:\/\/github\.com\/[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+/i);
  if (matchGithub) {
    directivaTactico += `[DETECCIÓN DE REPOSITORIO GITHUB: El Comandante proporcionó ${matchGithub[0]}. Si solicita auditarlo, analiza su arquitectura, diagramas C4 y seguridad.]\n`;
  }

  if (directivaTactico) {
    textoFinalMensaje = `${directivaTactico}\n${message}`;
  }

  const partesActuales: any[] = [{ text: textoFinalMensaje }];
  if (imageBase64) {
    partesActuales.unshift({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  historialTurnos.push({
    role: 'user',
    parts: partesActuales,
  });

  const stream = invocarLLMStream({
    contents: historialTurnos,
    provider,
    model,
    enableSearch: !imageBase64,
  });

  let acumulado = '';
  let poseDetectada = false;

  for await (const chunk of stream) {
    acumulado += chunk;

    // Detectar pose explícita en los primeros 120 caracteres si existe
    let poseDinamica: NumeroPose | undefined;
    if (!poseDetectada && acumulado.length > 10) {
      const encontrada = extraerPoseDeTexto(acumulado);
      if (encontrada) {
        poseNumber = encontrada;
        poseDinamica = encontrada;
        poseDetectada = true;
      }
    }

    yield {
      type: 'chunk',
      text: chunk,
      poseDetected: poseDinamica,
    };
  }

  // Guardar en la base de datos si está disponible
  try {
    if (idConversacion !== 'conv-memoria-temp') {
      await guardarMensaje(idConversacion, 'user', message);
      await guardarMensaje(idConversacion, 'model', acumulado, [], poseNumber);
    }
  } catch (err) {
    console.warn('⚠️ [ChatService] No se pudieron guardar mensajes en streaming:', err);
  }

  // Evento final de éxito
  yield {
    type: 'done',
    reply: acumulado,
    stance: 'VICTORY',
    poseNumber,
    conversationId: idConversacion,
  };
}
