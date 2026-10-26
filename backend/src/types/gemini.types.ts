/**
 * @fileoverview Tipos para la integración con la API de Google Gemini.
 * Modela las estructuras de contenido, configuración y respuesta del SDK @google/genai.
 * @module types/gemini.types
 */

/** Parte de contenido que puede ser texto o imagen inline */
export interface ParteContenido {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

/** Mensaje de contenido con rol (user | model) */
export interface ContenidoGemini {
  role: 'user' | 'model';
  parts: ParteContenido[];
}

/** Configuración de la solicitud a Gemini */
export interface ConfiguracionGemini {
  /** Instrucción del sistema (Mega-Prompt A.R.E.S.) */
  systemInstruction: string;
  /** Herramientas disponibles (p.ej. Google Search grounding) */
  tools?: Array<Record<string, unknown>>;
  /** Temperatura de generación (0.0 – 2.0) */
  temperature?: number;
  /** Máximo de tokens de salida */
  maxOutputTokens?: number;
}

/** Parámetros completos para una solicitud a generateContent */
export interface SolicitudGemini {
  model: string;
  contents: ContenidoGemini[];
  config: ConfiguracionGemini;
}

/** Fuente de grounding devuelta por Google Search */
export interface FuenteGrounding {
  uri: string;
  title: string;
}

/** Respuesta procesada del servicio de Gemini */
export interface RespuestaGemini {
  /** Texto generado por el modelo */
  texto: string;
  /** Fuentes de grounding (si Google Search estaba habilitado) */
  fuentes: FuenteGrounding[];
}
