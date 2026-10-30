import { AresError, requireText } from '../../shared/domain/errors.js';

export interface Turn {
  readonly prompt: string;
  readonly answer: string;
  readonly at: string;
  readonly model: string;
}

export interface ConversationData {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly turns: readonly Turn[];
}

/** Aggregate: a conversation contains only completed user/assistant pairs. */
export class Conversation {
  readonly data: ConversationData;

  constructor(data: ConversationData) {
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(data.id) || data.revision !== data.turns.length) {
      throw new AresError('VALIDATION', 'Conversación inválida.');
    }
    this.data = Object.freeze({ ...data, turns: Object.freeze(data.turns.map(t => Object.freeze({ ...t }))) });
    Object.freeze(this);
  }

  static start(id: string, at: string, title: string): Conversation {
    return new Conversation({ id, title: requireText(title, 'Título').slice(0, 80), createdAt: at, updatedAt: at, revision: 0, turns: [] });
  }

  append(turn: Turn): Conversation {
    requireText(turn.prompt, 'Consulta');
    requireText(turn.answer, 'Respuesta', 1_000_000);
    return new Conversation({ ...this.data, updatedAt: turn.at, revision: this.data.revision + 1, turns: [...this.data.turns, turn] });
  }
}
