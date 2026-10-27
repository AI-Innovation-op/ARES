/**
 * @fileoverview Enrutador Adaptativo & Conmutador Automático de Modelos de IA (v3.9).
 * Analiza la intención de la consulta para seleccionar automáticamente el mejor motor de IA
 * (DeepSeek R1 para razonamiento/DDD, DeepSeek V3 para código, Gemini 3 Flash para velocidad/búsqueda)
 * y ejecuta una conmutación resiliente en cascada (Failover Circuit Breaker) en caso de fallo.
 * @module services/ai-router.service
 */

import { invocarGemini, invocarGeminiStream } from './gemini.service.js';
import { invocarOpenRouter, invocarOpenRouterStream, type MensajeOpenRouter } from './openrouter.service.js';
import { env } from '../config/env.js';
import type { ContenidoGemini } from '../types/gemini.types.js';
import { MEGA_PROMPT_ARES } from './gemini.service.js';

export type CategoriaIntencionIA =
  | 'REASONING_DDD'      // Razonamiento lógico profundo, DDD, Big-O, Stryker, algoritmos
  | 'CODE_GEN'           // Generación masiva de código, TypeScript, Vue 3, refactorización
  | 'VISION_MULTIMODAL'  // Análisis de capturas de pantalla, imágenes o diagramas visuales
  | 'SEARCH_GROUNDING'   // Búsqueda en vivo de librerías, noticias, versiones actualizadas
  | 'GENERAL_FAST';      // Conversación rápida, resúmenes, traducción, chat táctico general

export interface ModeloCandidato {
  proveedor: 'gemini' | 'openrouter';
  modelo: string;
  nombre: string;
  icono: string;
  motivo: string;
}

export interface DecisionEnrutamientoIA {
  modeloSeleccionado: ModeloCandidato;
  categoriaIntencion: CategoriaIntencionIA;
  explicacion: string;
  cadenaFailover: ModeloCandidato[];
}

export interface IntentoConmutacion {
  modelo: string;
  proveedor: string;
  exitoso: boolean;
  error?: string;
  latenciaMs: number;
}

export interface ResultadoInvocacionResiliente {
  texto: string;
  proveedorUsado: 'gemini' | 'openrouter';
  modeloUsado: string;
  nombreModeloUsado: string;
  iconoModeloUsado: string;
  fuentes: Array<{ uri: string; title: string }>;
  conmutacionAutomatica: {
    fueConmutado: boolean;
    modeloInicial: string;
    modeloFinal: string;
    motivoConmutacion?: string;
    categoria: CategoriaIntencionIA;
    intentos: IntentoConmutacion[];
  };
}

export class AiRouterService {
  /**
   * Clasifica la intención del prompt para determinar la IA óptima.
   */
  static clasificarYEnrutar(
    prompt: string,
    tieneImagen: boolean = false
  ): DecisionEnrutamientoIA {
    const p = prompt.toLowerCase();

    // 1. Visión Multimodal (Prioridad absoluta: Google Gemini 3 Flash / 2.5 Flash)
    if (tieneImagen) {
      const seleccionado: ModeloCandidato = {
        proveedor: 'gemini',
        modelo: env.GEMINI_TEXT_MODEL || 'gemini-3-flash-preview',
        nombre: 'Gemini 3 Flash (Visión Táctica)',
        icono: '🟣',
        motivo: 'Capacidad multimodal nativa para análisis de capturas y diseño visual',
      };
      return {
        modeloSeleccionado: seleccionado,
        categoriaIntencion: 'VISION_MULTIMODAL',
        explicacion: 'Se detectó imagen adjunta. Enrutado a Gemini con soporte de visión.',
        cadenaFailover: [
          seleccionado,
          {
            proveedor: 'openrouter',
            modelo: 'openai/gpt-4o',
            nombre: 'GPT-4o (Multimodal Fallback)',
            icono: '🟢',
            motivo: 'Respaldo secundario multimodal',
          },
        ],
      };
    }

    // 2. Razonamiento Lógico Profundo, DDD, Big-O, Stryker, Benchmarks
    const palabrasRazonamiento = [
      'ddd',
      'bounded context',
      'domain-driven',
      'stryker',
      'mutación',
      'k6',
      'big-o',
      'complejidad',
      'invariante',
      'por qué',
      'analiza lógicamente',
      'resuelve',
      'algoritmo',
      'paradoja',
      'arquitectura de sistemas',
    ];
    if (palabrasRazonamiento.some((k) => p.includes(k))) {
      const seleccionado: ModeloCandidato = {
        proveedor: 'openrouter',
        modelo: 'deepseek/deepseek-r1-0528',
        nombre: 'DeepSeek R1 (Razonamiento Lógico)',
        icono: '🧠',
        motivo: 'Cadena de pensamiento reflexiva para problemas arquitectónicos y DDD complejos',
      };
      return {
        modeloSeleccionado: seleccionado,
        categoriaIntencion: 'REASONING_DDD',
        explicacion: 'Detectado requerimiento de razonamiento profundo o arquitectura DDD.',
        cadenaFailover: [
          seleccionado,
          {
            proveedor: 'openrouter',
            modelo: 'deepseek/deepseek-chat',
            nombre: 'DeepSeek V3',
            icono: '⚡',
            motivo: 'Respaldo de alta capacidad en código y lógica',
          },
          {
            proveedor: 'gemini',
            modelo: 'gemini-3-flash-preview',
            nombre: 'Gemini 3 Flash',
            icono: '🟣',
            motivo: 'Respaldo de alta resiliencia',
          },
        ],
      };
    }

    // 3. Generación Pesada de Código / TypeScript / Vue 3 / Refactorización
    const palabrasCodigo = [
      'código',
      'implementa',
      'programa',
      'typescript',
      'javascript',
      'vue',
      'componente',
      'función',
      'clase',
      'controller',
      'repositorio',
      'endpoint',
      'refactoriza',
      'forja',
      'unit test',
    ];
    if (palabrasCodigo.some((k) => p.includes(k))) {
      const seleccionado: ModeloCandidato = {
        proveedor: 'openrouter',
        modelo: 'deepseek/deepseek-chat',
        nombre: 'DeepSeek V3 (Generación de Código)',
        icono: '⚡',
        motivo: 'Especialista en síntesis veloz de código fuente TypeScript y Clean Code',
      };
      return {
        modeloSeleccionado: seleccionado,
        categoriaIntencion: 'CODE_GEN',
        explicacion: 'Detectado requerimiento de desarrollo o refactorización de código.',
        cadenaFailover: [
          seleccionado,
          {
            proveedor: 'gemini',
            modelo: 'gemini-3-flash-preview',
            nombre: 'Gemini 3 Flash',
            icono: '🟣',
            motivo: 'Respaldo rápido de Google',
          },
          {
            proveedor: 'openrouter',
            modelo: 'openai/gpt-4o',
            nombre: 'GPT-4o',
            icono: '🟢',
            motivo: 'Respaldo robusto de OpenAI',
          },
        ],
      };
    }

    // 4. Búsqueda en Vivo, Noticias, Grounding o Documentación Oficial
    const palabrasBusqueda = [
      'busca',
      'noticia',
      'último',
      'novedades',
      'año 2026',
      'año 2025',
      'google',
      'documentación oficial',
      'en vivo',
      'web',
    ];
    if (palabrasBusqueda.some((k) => p.includes(k))) {
      const seleccionado: ModeloCandidato = {
        proveedor: 'gemini',
        modelo: env.GEMINI_TEXT_MODEL || 'gemini-3-flash-preview',
        nombre: 'Gemini 3 Flash (Search Grounding)',
        icono: '🟣',
        motivo: 'Conexión a internet en vivo mediante Google Search Grounding',
      };
      return {
        modeloSeleccionado: seleccionado,
        categoriaIntencion: 'SEARCH_GROUNDING',
        explicacion: 'Detectada necesidad de consultar información externa o en vivo.',
        cadenaFailover: [
          seleccionado,
          {
            proveedor: 'openrouter',
            modelo: 'deepseek/deepseek-chat',
            nombre: 'DeepSeek V3',
            icono: '⚡',
            motivo: 'Respaldo de síntesis',
          },
        ],
      };
    }

    // 5. Chat General / Velocidad Ultrarrápida
    const seleccionado: ModeloCandidato = {
      proveedor: 'gemini',
      modelo: env.GEMINI_TEXT_MODEL || 'gemini-3-flash-preview',
      nombre: 'Gemini 3 Flash (Velocidad Nominal)',
      icono: '🟣',
      motivo: 'Tiempo de respuesta inferior a 400ms para chat interactivo fluido',
    };
    return {
      modeloSeleccionado: seleccionado,
      categoriaIntencion: 'GENERAL_FAST',
      explicacion: 'Consulta general: enrutamiento optimizado para mínima latencia.',
      cadenaFailover: [
        seleccionado,
        {
          proveedor: 'openrouter',
          modelo: 'deepseek/deepseek-chat',
          nombre: 'DeepSeek V3',
          icono: '⚡',
          motivo: 'Respaldo primario OpenRouter',
        },
      ],
    };
  }

  /**
   * Ejecuta una consulta LLM con conmutación por error en cascada automática.
   */
  static async ejecutarConmutacionResiliente(params: {
    contents: ContenidoGemini[];
    modeloDeseado?: string;
    proveedorDeseado?: string;
    systemInstruction?: string;
    enableSearch?: boolean;
    tieneImagen?: boolean;
  }): Promise<ResultadoInvocacionResiliente> {
    const ultimoMensajeUsuario = params.contents
      .filter((c) => c.role === 'user')
      .flatMap((c) => c.parts.map((p) => p.text || ''))
      .join(' ');

    const esModoAutomatico =
      !params.modeloDeseado ||
      params.modeloDeseado === 'auto' ||
      params.proveedorDeseado === 'auto';

    let cadenaIntentos: ModeloCandidato[] = [];
    let intencion: CategoriaIntencionIA = 'GENERAL_FAST';

    if (esModoAutomatico) {
      const decision = this.clasificarYEnrutar(ultimoMensajeUsuario, params.tieneImagen);
      intencion = decision.categoriaIntencion;
      cadenaIntentos = decision.cadenaFailover;
      console.log(
        `🤖 [Auto-Router IA] Intención: ${intencion} ➔ Asignado: ${decision.modeloSeleccionado.nombre} (${decision.modeloSeleccionado.motivo})`
      );
    } else {
      // Si el usuario fijó un modelo manual, ese es el primero, pero configuramos failover automático
      const prov = (params.proveedorDeseado as 'gemini' | 'openrouter') || (params.modeloDeseado?.startsWith('gemini') ? 'gemini' : 'openrouter');
      const principal: ModeloCandidato = {
        proveedor: prov,
        modelo: params.modeloDeseado!,
        nombre: params.modeloDeseado!,
        icono: prov === 'gemini' ? '🟣' : '⚡',
        motivo: 'Selección manual del Comandante',
      };
      const fallback: ModeloCandidato = {
        proveedor: prov === 'gemini' ? 'openrouter' : 'gemini',
        modelo: prov === 'gemini' ? 'deepseek/deepseek-chat' : 'gemini-3-flash-preview',
        nombre: prov === 'gemini' ? 'DeepSeek V3 (Failover)' : 'Gemini 3 Flash (Failover)',
        icono: prov === 'gemini' ? '⚡' : '🟣',
        motivo: 'Conmutación por fallo del modelo principal',
      };
      cadenaIntentos = [principal, fallback];
    }

    const intentosRegistrados: IntentoConmutacion[] = [];
    let ultimoError: any = null;

    for (let i = 0; i < cadenaIntentos.length; i++) {
      const candidato = cadenaIntentos[i];
      const inicio = Date.now();

      try {
        console.log(`📡 [LLM Gateway] Intentando invocar [${candidato.proveedor.toUpperCase()}]: ${candidato.modelo}...`);

        if (candidato.proveedor === 'openrouter') {
          const messages = this.transformarAOpenRouter(params.contents, params.systemInstruction);
          const resOR = await invocarOpenRouter({
            messages,
            model: candidato.modelo,
          });

          intentosRegistrados.push({
            modelo: candidato.modelo,
            proveedor: candidato.proveedor,
            exitoso: true,
            latenciaMs: Date.now() - inicio,
          });

          return {
            texto: resOR.texto,
            proveedorUsado: 'openrouter',
            modeloUsado: resOR.modelUsado,
            nombreModeloUsado: candidato.nombre,
            iconoModeloUsado: candidato.icono,
            fuentes: [],
            conmutacionAutomatica: {
              fueConmutado: i > 0,
              modeloInicial: cadenaIntentos[0].modelo,
              modeloFinal: candidato.modelo,
              motivoConmutacion: i > 0 ? `Fallo en modelo inicial (${ultimoError?.message || 'Error'}). Conmutado a ${candidato.nombre}.` : undefined,
              categoria: intencion,
              intentos: intentosRegistrados,
            },
          };
        } else {
          // Invocación Gemini
          const resGem = await invocarGemini({
            contents: params.contents,
            enableSearch: params.enableSearch ?? true,
          });

          intentosRegistrados.push({
            modelo: candidato.modelo,
            proveedor: candidato.proveedor,
            exitoso: true,
            latenciaMs: Date.now() - inicio,
          });

          return {
            texto: resGem.texto,
            proveedorUsado: 'gemini',
            modeloUsado: env.GEMINI_TEXT_MODEL || 'gemini-3-flash-preview',
            nombreModeloUsado: candidato.nombre,
            iconoModeloUsado: candidato.icono,
            fuentes: resGem.fuentes,
            conmutacionAutomatica: {
              fueConmutado: i > 0,
              modeloInicial: cadenaIntentos[0].modelo,
              modeloFinal: candidato.modelo,
              motivoConmutacion: i > 0 ? `Fallo en modelo inicial (${ultimoError?.message || 'Error'}). Conmutado a ${candidato.nombre}.` : undefined,
              categoria: intencion,
              intentos: intentosRegistrados,
            },
          };
        }
      } catch (err: any) {
        ultimoError = err;
        const duracion = Date.now() - inicio;
        console.warn(
          `⚠️ [Failover Alert] Falló ${candidato.nombre} tras ${duracion}ms (${err.message}). Evaluando siguiente candidato en la cadena...`
        );
        intentosRegistrados.push({
          modelo: candidato.modelo,
          proveedor: candidato.proveedor,
          exitoso: false,
          error: err.message,
          latenciaMs: duracion,
        });
      }
    }

    // Si todos los proveedores externos fallan (ej. offline total), generar respuesta heurística de emergencia
    console.error('💥 [Critical Circuit Breaker] Todos los modelos externos fallaron. Activando Núcleo Heurístico Local.');
    return {
      texto: `[🛡️ POSE 2: ALERTA DE EXCEPCIÓN | OJOS: [X X] | NÚCLEO: CENTINELA_LOCAL]\n\nComandante, he detectado una interrupción en el enlace neural con los proveedores externos de IA (${ultimoError?.message || 'Falla de red'}).\n\nEl sistema activó la conmutación de emergencia y preservó el estado de tu sesión. Verifica tu conexión a internet o tus claves de API (GEMINI_API_KEY / OPENROUTER_API_KEY) para restaurar la potencia total.`,
      proveedorUsado: 'gemini',
      modeloUsado: 'ares-local-sentinel',
      nombreModeloUsado: 'A.R.E.S. Local Sentinel (Offline Mode)',
      iconoModeloUsado: '🛡️',
      fuentes: [],
      conmutacionAutomatica: {
        fueConmutado: true,
        modeloInicial: cadenaIntentos[0].modelo,
        modeloFinal: 'ares-local-sentinel',
        motivoConmutacion: 'Todos los proveedores externos de IA fallaron. Activado Núcleo Heurístico Local.',
        categoria: intencion,
        intentos: intentosRegistrados,
      },
    };
  }

  private static transformarAOpenRouter(
    contents: ContenidoGemini[],
    systemInstruction?: string
  ): MensajeOpenRouter[] {
    const messages: MensajeOpenRouter[] = [
      {
        role: 'system',
        content: systemInstruction || MEGA_PROMPT_ARES,
      },
    ];

    for (const c of contents) {
      const role = c.role === 'user' ? 'user' : 'assistant';
      const textPart = c.parts.map((p) => p.text || '').filter(Boolean).join('\n');
      if (textPart) {
        messages.push({ role, content: textPart });
      }
    }

    return messages;
  }
}
