/**
 * @fileoverview Store de Pinia para la Consola de Chat Táctico de A.R.E.S.
 * Soporta streaming en tiempo real SSE y persistencia total en SQLite.
 * @module stores/chat.store
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { MensajeChat } from '../types/ares.types.js';
import { apiService } from '../services/api.service.js';
import { useFsmStore } from './fsm.store.js';
import { useTacticalVoice } from '../composables/useTacticalVoice.js';
import { useUiStore } from './ui.store.js';

export interface SesionConversacion {
  id: string;
  title: string;
  created_at: string;
}

export const useChatStore = defineStore('chat', () => {
  const fsm = useFsmStore();
  const uiStore = useUiStore();
  const { hablar } = useTacticalVoice();

  const mensajes = ref<MensajeChat[]>([
    {
      id: 'bienvenida',
      role: 'model',
      content:
        '🛡️ **A.R.E.S. Core v2.7 en línea (Forja de Proyectos & Empaquetador .ZIP Activo).**\n\nSaludos, Comandante. Consola táctica, avatar voxel y empaquetador multi-archivo listos:\n- **Mano derecha:** Espada Binaria de Refactorización (Big-O, SOLID, OWASP).\n- **Mano izquierda:** Escudo Aegis Documental (README, ADR, OpenAPI 3.1, RFC).\n- **Forja de Proyectos:** Generación completa de código y descarga en un solo archivo `.zip`.\n- **Memoria de Batalla:** Historial persistido en SQLite embebido local.\n- **Protocolo Bio-Armadura:** Monitoreo activo de estamina e hidratación.\n\n¿Cuál es la primera orden táctica?',
      poseNumber: 1,
      timestamp: new Date(),
    },
  ]);

  const cargando = ref(false);
  const conversacionIdActual = ref<string | undefined>(undefined);
  const conversaciones = ref<SesionConversacion[]>([]);
  const cargandoHistorial = ref(false);
  const errorMensaje = ref<string | null>(null);

  // Selector Multi-Modelo (Google Gemini + OpenRouter)
  const modelosDisponibles = ref<any[]>([]);
  const modeloSeleccionado = ref<string>(localStorage.getItem('ares.selected_model') || 'gemini-3-flash-preview');
  const proveedorSeleccionado = ref<'gemini' | 'openrouter'>((localStorage.getItem('ares.selected_provider') as any) || 'gemini');

  /**
   * Carga el catálogo de modelos disponibles desde la API.
   */
  async function cargarModelos() {
    try {
      const modelos = await apiService.obtenerModelos();
      modelosDisponibles.value = modelos;
    } catch (err) {
      console.warn('⚠️ [ChatStore] No se pudo cargar catálogo de modelos:', err);
    }
  }

  function cambiarModelo(idModelo: string, proveedor: 'gemini' | 'openrouter') {
    modeloSeleccionado.value = idModelo;
    proveedorSeleccionado.value = proveedor;
    localStorage.setItem('ares.selected_model', idModelo);
    localStorage.setItem('ares.selected_provider', proveedor);
  }

  /**
   * Carga la lista de sesiones de conversación previas desde SQLite.
   */
  async function cargarConversaciones() {
    try {
      const lista = await apiService.listarConversaciones(20);
      conversaciones.value = lista;
    } catch (err) {
      console.warn('⚠️ [ChatStore] No se pudo cargar lista de sesiones:', err);
    }
  }

  /**
   * Carga los mensajes de una sesión existente seleccionada por el Comandante.
   */
  async function seleccionarConversacion(id: string) {
    if (conversacionIdActual.value === id) return;
    cargandoHistorial.value = true;
    errorMensaje.value = null;

    try {
      const data = await apiService.obtenerMensajesConversacion(id);
      conversacionIdActual.value = id;
      localStorage.setItem('ares.active_conv', id);

      if (data.mensajes && data.mensajes.length > 0) {
        mensajes.value = data.mensajes.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          poseNumber: m.pose_number ?? (m.role === 'model' ? 1 : undefined),
          timestamp: new Date(m.created_at),
        }));
      } else {
        mensajes.value = [
          {
            id: `init-${id}`,
            role: 'model',
            content: `🛡️ **Sesión "${data.conversacion.title || 'Misión'}" reanudada.**\n\nEsperando instrucciones...`,
            poseNumber: 1,
            timestamp: new Date(),
          },
        ];
      }
      fsm.cambiarPostura('IDLE', 1);
    } catch (err: any) {
      console.error('Error cargando mensajes de sesión:', err);
      errorMensaje.value = 'No se pudo cargar la sesión seleccionada.';
    } finally {
      cargandoHistorial.value = false;
    }
  }

  /**
   * Inicia una nueva sesión de combate táctico.
   */
  async function nuevaSesion(titulo?: string) {
    cargando.value = true;
    try {
      const conv = await apiService.crearConversacion(titulo);
      conversacionIdActual.value = conv.id;
      localStorage.setItem('ares.active_conv', conv.id);

      mensajes.value = [
        {
          id: `new-${conv.id}`,
          role: 'model',
          content: `🛡️ **Nueva Misión Táctica Iniciada: ${conv.title}**\n\nMemoria limpia para este hilo de combate. Adelante, Comandante.`,
          poseNumber: 1,
          timestamp: new Date(),
        },
      ];

      await cargarConversaciones();
      fsm.cambiarPostura('IDLE', 1);
    } catch (err) {
      console.warn('⚠️ [ChatStore] Creando sesión local provisional:', err);
      conversacionIdActual.value = undefined;
      limpiarConsola();
    } finally {
      cargando.value = false;
    }
  }

  /**
   * Elimina una conversación y sus mensajes.
   */
  async function eliminarSesion(id: string) {
    try {
      await apiService.eliminarConversacion(id);
      if (conversacionIdActual.value === id) {
        conversacionIdActual.value = undefined;
        localStorage.removeItem('ares.active_conv');
        limpiarConsola();
      }
      await cargarConversaciones();
    } catch (err) {
      console.error('Error eliminando sesión:', err);
    }
  }

  /**
   * Envía un mensaje con streaming SSE en tiempo real y persistencia en SQLite.
   * Utiliza el elemento reactivo del array para garantizar que cada token
   * renderice de forma instantánea en la interfaz.
   */
  async function enviarMensaje(texto: string, imagenBase64?: string) {
    if (!texto.trim() && !imagenBase64) return;

    // 1. Agregar mensaje del usuario al historial visual
    mensajes.value.push({
      id: `usr-${Date.now()}`,
      role: 'user',
      content: texto,
      timestamp: new Date(),
    });

    cargando.value = true;
    errorMensaje.value = null;

    // 2. Crear mensaje modelo en blanco para llenar con tokens del streaming
    const idModelo = `ares-${Date.now()}`;
    mensajes.value.push({
      id: idModelo,
      role: 'model',
      content: '',
      poseNumber: fsm.poseActual.id,
      timestamp: new Date(),
    });

    // Referencia al mensaje reactivo recién insertado en la lista
    const targetIdx = mensajes.value.length - 1;

    try {
      // 3. Ejecutar streaming en tiempo real vía SSE
      await apiService.enviarMensajeChatStream({
        message: texto,
        conversationId: conversacionIdActual.value,
        imageBase64: imagenBase64,
        provider: proveedorSeleccionado.value,
        model: modeloSeleccionado.value,

        onInit(data) {
          conversacionIdActual.value = data.conversationId;
          localStorage.setItem('ares.active_conv', data.conversationId);
          if (mensajes.value[targetIdx]) {
            mensajes.value[targetIdx].poseNumber = data.poseNumber;
          }
          fsm.cambiarPostura(data.stance, data.poseNumber);
        },

        onChunk(chunk, poseDetected) {
          if (mensajes.value[targetIdx]) {
            mensajes.value[targetIdx].content += chunk;
            if (poseDetected) {
              mensajes.value[targetIdx].poseNumber = poseDetected;
              fsm.fijarPoseDirecta(poseDetected);
            }
          }
        },

        onDone(data) {
          conversacionIdActual.value = data.conversationId;
          localStorage.setItem('ares.active_conv', data.conversationId);
          if (mensajes.value[targetIdx]) {
            mensajes.value[targetIdx].content = data.reply;
            mensajes.value[targetIdx].poseNumber = data.poseNumber;
          }
          fsm.cambiarPostura(data.stance, data.poseNumber);

          // Actualizar lista de sesiones en segundo plano
          cargarConversaciones();

          // Lectura táctica en voz alta de A.R.E.S.
          hablar(data.reply);

          // Auto-derivación táctica inmediata a su módulo correspondiente
          ejecutarAutoDerivacion(texto, data.reply);
        },

        onError(err) {
          throw err;
        },
      });
    } catch (streamErr: any) {
      console.warn('⚠️ [ChatStore] Error en streaming, activando respaldo HTTP directo:', streamErr);

      // Si el streaming falla o se corta, fallback inmediato a petición normal para nunca dejar la burbuja vacía
      try {
        const data = await apiService.enviarMensajeChat({
          message: texto,
          conversationId: conversacionIdActual.value,
          imageBase64: imagenBase64,
          provider: proveedorSeleccionado.value,
          model: modeloSeleccionado.value,
        });

        conversacionIdActual.value = data.conversationId;
        localStorage.setItem('ares.active_conv', data.conversationId);
        if (mensajes.value[targetIdx]) {
          mensajes.value[targetIdx].content = data.reply;
          mensajes.value[targetIdx].poseNumber = data.poseNumber || 1;
        }
        fsm.cambiarPostura(data.stance || 'IDLE', data.poseNumber || 1);

        cargarConversaciones();
        hablar(data.reply);
        ejecutarAutoDerivacion(texto, data.reply);
      } catch (err: any) {
        console.error('💥 [ChatStore] Fallo en envío de orden táctica:', err);
        fsm.cambiarPostura('ERROR', 2);
        errorMensaje.value = err.message || 'Falla de comunicación con el Núcleo Táctico de A.R.E.S.';

        if (mensajes.value[targetIdx]) {
          mensajes.value[targetIdx].content = `⚠️ **ALERTA DE EXCEPCIÓN:** ${errorMensaje.value}`;
          mensajes.value[targetIdx].poseNumber = 2;
        }
      }
    } finally {
      cargando.value = false;
    }
  }

  /**
   * Analiza el requerimiento del usuario y la respuesta entregada para transportar
   * automáticamente el artefacto forjado a su módulo dedicado (Escudo, Espada o Arquitecto).
   */
  function ejecutarAutoDerivacion(prompt: string, respuesta: string) {
    const p = prompt.toLowerCase();
    const r = respuesta.toLowerCase();

    // 1. Detección de Documentación (RFC, README, ADR, OpenAPI, Especificaciones)
    const pideDoc =
      p.includes('rfc') ||
      p.includes('readme') ||
      p.includes('adr') ||
      p.includes('openapi') ||
      p.includes('documento') ||
      p.includes('documentar') ||
      p.includes('especificación') ||
      p.includes('propuesta');

    const contieneDoc =
      r.includes('# rfc') ||
      r.includes('# readme') ||
      r.includes('## adr') ||
      r.includes('openapi: 3') ||
      r.includes('contexto y problema') ||
      r.includes('solución propuesta');

    // 2. Detección de Arquitectura / Diagramas Mermaid
    const pideArq =
      p.includes('arquitectura') ||
      p.includes('diagrama') ||
      p.includes('system design') ||
      p.includes('diseño de sistema') ||
      p.includes('c4') ||
      p.includes('hexagonal');

    const contieneMermaid = respuesta.includes('```mermaid');

    // 3. Detección de Código / Auditoría / Refactorización
    const pideCodigo =
      p.includes('código') ||
      p.includes('codigo') ||
      p.includes('refactoriza') ||
      p.includes('refactorizar') ||
      p.includes('test') ||
      p.includes('pruebas') ||
      p.includes('función') ||
      p.includes('algoritmo') ||
      p.includes('audita');

    const contieneCodigo = /```(typescript|javascript|python|go|rust|java|sql)\n/i.test(respuesta);

    // 4. Detección de Proyecto Completo / Scaffolding Multi-Archivo (v2.7)
    const pideProyecto =
      p.includes('página web') ||
      p.includes('pagina web') ||
      p.includes('proyecto') ||
      p.includes('web de') ||
      p.includes('aplicación') ||
      p.includes('aplicacion') ||
      p.includes('scaffold') ||
      p.includes('zip');

    const tieneMultiplesArchivos = (respuesta.match(/(?:###|##|\*\*)\s*(?:File|Archivo):/gi) || []).length >= 2;

    // Si es un proyecto multi-archivo solicitado (ej: café con DDD), permanecemos en el chat
    // para interactuar directamente con la caja de Forja de Proyecto y el botón .ZIP
    if (pideProyecto && tieneMultiplesArchivos) {
      return;
    }

    // Prioridad 1: Si se solicitó o generó Documentación (RFC, ADR, README)
    if (pideDoc || contieneDoc) {
      let tipo: any = 'RFC';
      if (p.includes('readme') || r.includes('# readme')) tipo = 'README';
      else if (p.includes('adr') || r.includes('## adr')) tipo = 'ADR';
      else if (p.includes('openapi') || r.includes('openapi: 3')) tipo = 'OPENAPI';

      const matchTitulo = respuesta.match(/^#\s+(.+)$/m);
      const tituloSugerido = matchTitulo
        ? matchTitulo[1].replace(/[*#]/g, '').trim()
        : 'RFC / Propuesta Técnica';

      // Transición automática tras breve pausa táctica (1.2s para asimilar la respuesta)
      setTimeout(() => {
        uiStore.derivarADocumentacion(respuesta, tituloSugerido, tipo);
      }, 1200);
      return;
    }

    // Prioridad 2: Si es un requerimiento arquitectónico o diagrama puro
    if ((pideArq || contieneMermaid) && !pideCodigo) {
      setTimeout(() => {
        uiStore.derivarAArquitecto(respuesta);
      }, 1200);
      return;
    }

    // Prioridad 3: Si es código o suite de pruebas
    if (pideCodigo || contieneCodigo) {
      const matchCode = respuesta.match(/```([a-z0-9_-]*)\n([\s\S]*?)```/i);
      const code = matchCode ? matchCode[2].trim() : respuesta;
      const lang = matchCode ? matchCode[1] : 'typescript';
      setTimeout(() => {
        uiStore.derivarACodigo(code, lang);
      }, 1200);
      return;
    }
  }

  function limpiarConsola() {
    mensajes.value = [
      {
        id: 'bienvenida',
        role: 'model',
        content:
          '🛡️ **A.R.E.S. Core v2.6 en línea (Persistencia Total SQLite Activa).**\n\nConsola reiniciada. ¿Cuál es tu siguiente orden táctica, Comandante?',
        poseNumber: 1,
        timestamp: new Date(),
      },
    ];
    conversacionIdActual.value = undefined;
    fsm.cambiarPostura('IDLE', 1);
  }

  return {
    mensajes,
    cargando,
    conversacionIdActual,
    conversaciones,
    cargandoHistorial,
    errorMensaje,
    cargarConversaciones,
    seleccionarConversacion,
    nuevaSesion,
    eliminarSesion,
    enviarMensaje,
    limpiarConsola,
    modelosDisponibles,
    modeloSeleccionado,
    proveedorSeleccionado,
    cargarModelos,
    cambiarModelo,
  };
});
