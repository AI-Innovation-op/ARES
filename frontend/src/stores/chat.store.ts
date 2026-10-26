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

export interface SesionConversacion {
  id: string;
  title: string;
  created_at: string;
}

export const useChatStore = defineStore('chat', () => {
  const fsm = useFsmStore();
  const { hablar } = useTacticalVoice();

  const mensajes = ref<MensajeChat[]>([
    {
      id: 'bienvenida',
      role: 'model',
      content:
        '🛡️ **A.R.E.S. Core v2.6 en línea (Persistencia Total SQLite Activa).**\n\nSaludos, Comandante. Consola táctica y avatar voxel inicializados. Mis armas y memoria persistente están listas:\n- **Mano derecha:** Espada Binaria de Refactorización (Big-O, SOLID, OWASP).\n- **Mano izquierda:** Escudo Aegis Documental (README, ADR, OpenAPI 3.1).\n- **Memoria de Batalla:** Historial persistido en SQLite embebido local.\n- **Protocolo Bio-Armadura:** Monitoreo activo de estamina e hidratación.\n\n¿Cuál es la primera orden táctica?',
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
    const mensajeModelo: MensajeChat = {
      id: idModelo,
      role: 'model',
      content: '',
      poseNumber: fsm.poseActual.id,
      timestamp: new Date(),
    };
    mensajes.value.push(mensajeModelo);

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
          mensajeModelo.poseNumber = data.poseNumber;
          fsm.cambiarPostura(data.stance, data.poseNumber);
        },

        onChunk(chunk, poseDetected) {
          mensajeModelo.content += chunk;
          if (poseDetected) {
            mensajeModelo.poseNumber = poseDetected;
            fsm.fijarPoseDirecta(poseDetected);
          }
        },

        onDone(data) {
          conversacionIdActual.value = data.conversationId;
          localStorage.setItem('ares.active_conv', data.conversationId);
          mensajeModelo.content = data.reply;
          mensajeModelo.poseNumber = data.poseNumber;
          fsm.cambiarPostura(data.stance, data.poseNumber);

          // Actualizar lista de sesiones en segundo plano
          cargarConversaciones();

          // Lectura táctica en voz alta de A.R.E.S.
          hablar(data.reply);
        },

        onError(err) {
          throw err;
        },
      });
    } catch (err: any) {
      console.error('💥 [ChatStore] Error en streaming de orden táctica:', err);
      fsm.cambiarPostura('ERROR', 2);
      errorMensaje.value = err.message || 'Falla de comunicación con el Núcleo Táctico de A.R.E.S.';

      mensajeModelo.content = `⚠️ **ALERTA DE EXCEPCIÓN:** ${errorMensaje.value}`;
      mensajeModelo.poseNumber = 2;
    } finally {
      cargando.value = false;
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
