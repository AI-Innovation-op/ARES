/**
 * @fileoverview Servicio táctico de Entrada de Voz y Visualización de Ondas Holográficas (v2.9).
 * Integra Web Speech API para reconocimiento continuo y AudioContext/AnalyserNode
 * para capturar la energía vocal en tiempo real y alimentar el HUD de A.R.E.S.
 * @module services/voice.service
 */

import { ref } from 'vue';
import { useChatStore } from '../stores/chat.store.js';

export type EstadoVoz = 'inactivo' | 'solicitando' | 'escuchando' | 'procesando' | 'error';

export interface CallbacksVoz {
  onTranscripcion?: (texto: string, esFinal: boolean) => void;
  onComandoEnviar?: () => void;
  onError?: (mensaje: string) => void;
}

export class VoiceService {
  public estado = ref<EstadoVoz>('inactivo');
  public nivelesAudio = ref<number[]>(new Array(16).fill(0));
  public transcripcion = ref<string>('');
  public error = ref<string | null>(null);

  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private dataArray: Uint8Array | null = null;
  private callbacks: CallbacksVoz = {};

  public get esSoportado(): boolean {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  /**
   * Inicializa la instancia de SpeechRecognition si no existe.
   */
  private inicializarSpeechRecognition() {
    if (!this.esSoportado) return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();
    this.recognition.lang = 'es-ES';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.estado.value = 'escuchando';
      this.error.value = null;
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcrito = item[0]?.transcript || '';
        if (item.isFinal) {
          final += transcrito;
        } else {
          interim += transcrito;
        }
      }

      const textoActual = final || interim;
      this.transcripcion.value = textoActual;

      // Detectar comando verbal táctico flexible (con comas, pausas o sinónimos de enviar)
      const regexComandoMedio = /(?:a\.?r\.?e\.?s\.?|ares)[,\s]+(?:enviar|envía|envia|manda|ejecutar)/i;
      const regexComandoFinal = /(?:(?:a\.?r\.?e\.?s\.?|ares)[,\s]+)?(?:enviar|envía|envia|manda|ejecutar)(?:\s+orden|\s+ahora|\s+mensaje)?$/i;

      if (regexComandoMedio.test(textoActual) || (regexComandoFinal.test(textoActual.trim()) && textoActual.trim().length > 5)) {
        // Limpiar el comando del texto y disparar despacho inmediato
        const textoLimpio = textoActual
          .replace(/(?:a\.?r\.?e\.?s\.?|ares)[,\s]+(?:enviar|envía|envia|manda|ejecutar)(?:\s+orden|\s+ahora|\s+mensaje)?/gi, '')
          .replace(/(?:enviar|envía|envia|ejecutar)\s+(?:orden|ahora|mensaje)/gi, '')
          .replace(/\s+(?:enviar|envía|envia)$/gi, '')
          .trim();

        if (textoLimpio.length > 0) {
          this.transcripcion.value = textoLimpio;
          if (this.callbacks.onTranscripcion) {
            this.callbacks.onTranscripcion(textoLimpio, true);
          }
          this.despacharOrdenVocal(textoLimpio);
          return;
        }
      }

      if (this.callbacks.onTranscripcion) {
        this.callbacks.onTranscripcion(textoActual, Boolean(final));
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('⚠️ [VoiceService] Error en reconocimiento vocal:', event.error);
      if (event.error === 'not-allowed') {
        this.error.value = 'Permiso de micrófono denegado en el navegador.';
      } else if (event.error === 'no-speech') {
        // Silencio normal, no bloquear
        return;
      } else {
        this.error.value = `Error de audio: ${event.error}`;
      }
      this.estado.value = 'error';
      if (this.callbacks.onError && this.error.value) {
        this.callbacks.onError(this.error.value);
      }
    };

    this.recognition.onend = () => {
      if (this.estado.value === 'escuchando') {
        // Si sigue activo el estado, intentar reiniciar automáticamente para captura continua
        try {
          this.recognition.start();
        } catch {
          this.estado.value = 'inactivo';
        }
      } else {
        this.estado.value = 'inactivo';
      }
    };
  }

  /**
   * Conecta el micrófono con AudioContext y AnalyserNode para obtener ondas en tiempo real.
   */
  private async iniciarAnalizadorAudio(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // Genera 32 bandas de frecuencia
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      const actualizarOndas = () => {
        if (!this.analyser || !this.dataArray || this.estado.value !== 'escuchando') {
          this.nivelesAudio.value = new Array(16).fill(0);
          return;
        }

        this.analyser.getByteFrequencyData(this.dataArray as any);

        // Muestrear 16 barras equidistantes normalizadas entre 0 y 1
        const barras: number[] = [];
        const paso = Math.max(1, Math.floor(bufferLength / 16));

        for (let i = 0; i < 16; i++) {
          const val = this.dataArray[i * paso] || 0;
          barras.push(Math.min(1, Math.max(0.08, val / 255)));
        }

        this.nivelesAudio.value = barras;
        this.animFrameId = requestAnimationFrame(actualizarOndas);
      };

      this.animFrameId = requestAnimationFrame(actualizarOndas);
    } catch (err: any) {
      console.warn('⚠️ [VoiceService] No se pudo inicializar AudioContext para ondas:', err);
    }
  }

  /**
   * Inicia la escucha vocal táctica.
   */
  async iniciarEscucha(callbacks: CallbacksVoz = {}): Promise<void> {
    this.callbacks = callbacks;
    this.error.value = null;
    this.transcripcion.value = '';

    if (!this.esSoportado) {
      this.error.value = 'Web Speech API no está soportada en este navegador. Se recomienda Google Chrome, Edge o Safari.';
      this.estado.value = 'error';
      callbacks.onError?.(this.error.value || 'Error al iniciar escucha');
      return;
    }

    try {
      this.estado.value = 'solicitando';
      this.inicializarSpeechRecognition();
      await this.iniciarAnalizadorAudio();
      this.recognition.start();
    } catch (err: any) {
      console.error('💥 Falla al iniciar micrófono:', err);
      this.error.value = err.message || 'Error al acceder al micrófono.';
      this.estado.value = 'error';
      callbacks.onError?.(this.error.value || 'Error al iniciar escucha');
      this.detenerEscucha();
    }
  }

  /**
   * Detiene la escucha y libera los recursos de audio.
   */
  detenerEscucha(): void {
    this.estado.value = 'inactivo';

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.nivelesAudio.value = new Array(16).fill(0);
  }

  /**
   * Alterna entre iniciar y detener escucha.
   */
  toggleEscucha(callbacks: CallbacksVoz = {}): void {
    if (this.estado.value === 'escuchando' || this.estado.value === 'solicitando') {
      this.detenerEscucha();
    } else {
      this.iniciarEscucha(callbacks);
    }
  }

  /**
   * Despacha directamente la transcripción vocal acumulada a la consola de A.R.E.S.
   */
  despacharOrdenVocal(textoManual?: string): void {
    const textoAEnviar = (textoManual || this.transcripcion.value).trim();
    if (!textoAEnviar) return;

    this.detenerEscucha();
    try {
      const chatStore = useChatStore();
      chatStore.enviarMensaje(textoAEnviar);
    } catch (err) {
      console.warn('⚠️ [VoiceService] Error al despachar a chatStore:', err);
      this.callbacks.onComandoEnviar?.();
    }
    this.transcripcion.value = '';
  }
}

export const voiceService = new VoiceService();
