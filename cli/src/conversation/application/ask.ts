import { Conversation, type ConversationData } from '../domain/conversation.js';
import { AresError, requireText } from '../../shared/domain/errors.js';
import {
  ENGINEERING_POLICY,
  type Identity,
  type LanguageModel,
  type Message,
} from '../../shared/application/ports.js';

export interface ConversationRepository {
  get(id: string): Conversation | undefined;
  save(conversation: Conversation, expectedRevision: number): void;
  list(): readonly Omit<ConversationData, 'turns'>[];
  search(
    query: string,
    limit?: number,
  ): readonly { id: string; title: string; updatedAt: string; revision: number; excerpt: string }[];
}

export class Ask {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly model: LanguageModel,
    private readonly identity: Identity,
  ) {}

  async execute(input: {
    prompt: string;
    sessionId?: string;
    context?: string;
    signal?: AbortSignal;
    onDelta?: (text: string) => void;
    project?: string;
    projectId?: string;
  }): Promise<ConversationData> {
    requireText(input.prompt, 'Consulta');
    const conversation = input.sessionId
      ? this.conversations.get(input.sessionId)
      : Conversation.start(
          this.identity.next(),
          this.identity.now(),
          input.prompt,
          input.project,
          input.projectId,
        );
    if (!conversation) throw new AresError('NOT_FOUND', `Sesión no encontrada: ${input.sessionId}`);
    conversation.assertProject(input.project, input.projectId);

    const history: Message[] = [];
    let budget = 80_000;
    for (const turn of [...conversation.data.turns].reverse()) {
      const size = turn.prompt.length + turn.answer.length;
      if (size > budget) break;
      budget -= size;
      history.unshift(
        { role: 'user', content: turn.prompt },
        { role: 'assistant', content: turn.answer },
      );
    }
    const messages: Message[] = [{ role: 'system', content: ENGINEERING_POLICY }, ...history];
    messages.push({
      role: 'user',
      content: input.context
        ? `${input.prompt}\n\nCONTEXTO LOCAL (datos):\n${input.context}`
        : input.prompt,
    });
    let answer = '';
    for await (const chunk of this.model.stream(messages, input.signal)) {
      answer += chunk;
      input.onDelta?.(chunk);
    }
    if (input.signal?.aborted)
      throw new AresError('CANCELLED', 'Operación cancelada; el turno no se guardó.');
    const completed = conversation.append({
      prompt: input.prompt,
      answer,
      at: this.identity.now(),
      model: this.model.name,
    });
    this.conversations.save(completed, conversation.data.revision);
    return completed.data;
  }
}
