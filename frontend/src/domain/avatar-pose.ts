import type { InfoPose } from '../types/ares.types.js';

export interface Pose {
  readonly id: number;
  readonly name: string;
  readonly shield: 'DOC' | 'CODE' | 'CREST' | 'NONE';
  readonly action:
    'stand' | 'run' | 'sword-low' | 'sword-high' | 'sword-guard' | 'slash' | 'shield';
}

/** Adapt the existing visual state machine to the supplied articulated model. */
export function visualPose(pose: InfoPose): Pose {
  const actions: Record<string, Pose['action']> = {
    STAND: 'stand',
    RUN_1: 'run',
    RUN_2: 'run',
    RUN_3: 'run',
    RUN_4: 'run',
    SWORD_LOW: 'sword-low',
    SWORD_HIGH: 'sword-high',
    SWORD_GUARD: 'sword-guard',
    ANIME_SLASH: 'slash',
    SHIELD_WALL: 'shield',
  };
  return Object.freeze({
    id: pose.id,
    name: pose.name,
    shield: pose.shield,
    action: actions[pose.action3d] ?? 'stand',
  });
}
