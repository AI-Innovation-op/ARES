/**
 * @fileoverview Tipos del ecosistema A.R.E.S. para el frontend.
 * @module types/ares.types
 */

export type Postura = 'IDLE' | 'SLASH' | 'SHIELD' | 'SPRINT' | 'ERROR' | 'VICTORY';

export type NumeroPose = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type PresetOjos =
  | 'NORMAL'
  | 'DEAD'
  | 'SQUINT'
  | 'HAPPY_SQUINT'
  | 'ANGRY'
  | 'DETERMINED'
  | 'ARC_HAPPY'
  | 'CYBER_SCAN';

export type TipoEscudo = 'DOC' | 'CODE' | 'CREST' | 'NONE';

export type Accion3D =
  | 'STAND'
  | 'RUN_1'
  | 'RUN_2'
  | 'RUN_3'
  | 'RUN_4'
  | 'SWORD_LOW'
  | 'SWORD_HIGH'
  | 'ANIME_SLASH'
  | 'SWORD_GUARD'
  | 'SHIELD_WALL';

export interface InfoPose {
  id: NumeroPose;
  code: string;
  name: string;
  eyes: PresetOjos;
  shield: TipoEscudo;
  action3d: Accion3D;
  description: string;
}

export type TipoDocumento =
  | 'README'
  | 'ADR'
  | 'RFC'
  | 'OPENAPI'
  | 'CHANGELOG'
  | 'MERMAID_C4'
  | 'DOCSTRINGS';

export interface Metricas {
  bigO_antes: string;
  bigO_despues: string;
  solid_antes: number;
  solid_despues: number;
  seguridad_antes: string;
  seguridad_despues: string;
}

export interface MensajeChat {
  id: string;
  role: 'user' | 'model';
  content: string;
  sources?: Array<{ uri: string; title: string }>;
  poseNumber?: NumeroPose;
  timestamp: Date;
}

export interface RespuestaChat {
  reply: string;
  stance: Postura;
  poseNumber: NumeroPose;
  conversationId: string;
  sources: Array<{ uri: string; title: string }>;
}

export interface RespuestaAuditoria {
  analysis: string;
  refactoredCode: string;
  metrics: Metricas | null;
  stance: Postura;
  poseNumber: NumeroPose;
}

export interface RespuestaDocumento {
  markdownContent: string;
  docType: TipoDocumento;
  title: string;
  documentId: string | null;
  stance: Postura;
  poseNumber: NumeroPose;
}

export interface EstadoBio {
  aguaPct: number;
  minutosSesion: number;
  estaminaPct: number;
  penalizacionFatiga: number;
  bonoDescanso: number;
  sprintsCompletados: number;
  nivelFatiga: 'OPTIMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL_BURNOUT';
  requiereIntervencion: boolean;
  mensajeIntervencion: string | null;
}
