/**
 * @fileoverview Tipos de dominio del agente A.R.E.S.
 * Define todas las interfaces y tipos que modelan el universo táctico del sistema.
 * @module types/ares.types
 */

// ============================================================================
// Enums y Tipos Literales del Dominio
// ============================================================================

/** Postura de combate del agente (máquina de estados visual) */
export type Postura = 'IDLE' | 'SLASH' | 'SHIELD' | 'SPRINT' | 'ERROR' | 'VICTORY';

/** Número de pose del avatar voxel-anime (1–16) */
export type NumeroPose = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

/** Tipo de documento técnico generado por el Escudo Aegis */
export type TipoDocumento =
  | 'README'
  | 'ADR'
  | 'RFC'
  | 'OPENAPI'
  | 'CHANGELOG'
  | 'MERMAID_C4'
  | 'DOCSTRINGS';

/** Nivel de fatiga detectado por el Protocolo Bio-Armadura */
export type NivelFatiga = 'OPTIMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL_BURNOUT';

/** Fuente que dispara un cambio de estado */
export type FuenteDisparo = 'CHAT' | 'TAB' | 'MODULE' | 'BIO' | 'MANUAL';

/** Nivel de seguridad del código */
export type NivelSeguridad = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'BLINDADA';

/** Intención detectada en el mensaje del usuario */
export type IntencionUsuario = 'FATIGUE' | 'SLASH' | 'SHIELD' | 'SPRINT';

// ============================================================================
// Entidades de Dominio (mapean a tablas de PostgreSQL)
// ============================================================================

/** Perfil del desarrollador / Comandante */
export interface Comandante {
  id: string;
  alias: string;
  /** Stacks tecnológicos preferidos (array JSON) */
  preferred_stacks: string[];
  /** Convenciones de código personalizadas */
  coding_conventions: string | null;
  locale: string;
  voice_enabled: boolean;
  created_at: Date;
}

/** Repositorio protegido por A.R.E.S. */
export interface Repositorio {
  id: string;
  commander_id: string;
  name: string;
  repo_url: string | null;
  architecture_pattern: string;
  /** Porcentaje de cobertura documental (Escudo Aegis) */
  doc_coverage_score: number;
  /** Puntuación de salud SOLID (Espada Binaria) */
  solid_health_score: number;
  last_synced_commit: string | null;
  created_at: Date;
}

/** Documento técnico almacenado en la Bóveda Aegis */
export interface DocumentoTecnico {
  id: string;
  repository_id: string;
  doc_type: TipoDocumento;
  adr_number: number | null;
  title: string;
  version: string;
  markdown_content: string;
  status: 'DRAFT' | 'APPROVED' | 'DEPRECATED';
  created_at: Date;
  updated_at: Date;
}

/** Registro de auditoría de la Espada Binaria */
export interface AuditoriaCodigoEntidad {
  id: string;
  repository_id: string;
  file_path: string;
  original_complexity: string | null;
  optimized_complexity: string | null;
  solid_score_before: number | null;
  solid_score_after: number | null;
  security_before: string | null;
  security_after: string | null;
  /** Vulnerabilidades OWASP detectadas */
  vulnerabilities_found: Array<{ code: string; description: string }>;
  refactored_code: string;
  audited_at: Date;
}

/** Conversación del chat */
export interface Conversacion {
  id: string;
  commander_id: string;
  title: string | null;
  created_at: Date;
}

/** Mensaje individual dentro de una conversación */
export interface Mensaje {
  id: string;
  conversation_id: string;
  role: 'user' | 'model';
  content: string;
  /** Fuentes de grounding [{uri, title}] */
  sources: Array<{ uri: string; title: string }>;
  pose_number: NumeroPose | null;
  created_at: Date;
}

/** Registro de telemetría del Protocolo Bio-Armadura */
export interface TelemetriaBio {
  id: string;
  commander_id: string;
  continuous_coding_minutes: number;
  hydration_level_pct: number | null;
  stamina_pct: number | null;
  detected_fatigue_level: NivelFatiga | null;
  spartan_intervention_triggered: boolean;
  logged_at: Date;
}

/** Evento de la máquina de estados del agente */
export interface EventoEstadoAgente {
  id: string;
  commander_id: string;
  stance: Postura;
  pose_number: NumeroPose;
  trigger_source: FuenteDisparo;
  occurred_at: Date;
}

// ============================================================================
// Métricas parseadas de la Espada Binaria
// ============================================================================

/** Métricas extraídas de la línea METRICAS de la respuesta de Gemini */
export interface Metricas {
  /** Complejidad Big-O antes de la refactorización */
  bigO_antes: string;
  /** Complejidad Big-O después de la refactorización */
  bigO_despues: string;
  /** Puntuación SOLID antes (0-100) */
  solid_antes: number;
  /** Puntuación SOLID después (0-100) */
  solid_despues: number;
  /** Nivel de seguridad antes */
  seguridad_antes: string;
  /** Nivel de seguridad después */
  seguridad_despues: string;
}
