import { complete, ENGINEERING_POLICY, type LanguageModel } from '../../shared/application/ports.js';
import { AresError, requireText } from '../../shared/domain/errors.js';

export const DOCUMENT_TYPES = ['readme', 'adr', 'rfc', 'openapi', 'c4', 'tests'] as const;
export async function generateDocument(model: LanguageModel, type: string, instruction: string, context: string, signal?: AbortSignal): Promise<string> {
  if (!(DOCUMENT_TYPES as readonly string[]).includes(type)) throw new AresError('VALIDATION', `Tipo inválido. Usa: ${DOCUMENT_TYPES.join(', ')}.`);
  requireText(instruction, 'Instrucción');
  return complete(model, [
    { role: 'system', content: ENGINEERING_POLICY + '\nEntrega exclusivamente el documento o archivo solicitado. Para ADR usa contexto, decisión, alternativas y consecuencias; para OpenAPI usa YAML 3.1; para c4 usa Mermaid. Para tests entrega casos útiles sin afirmar que se ejecutaron. No inventes funciones ni endpoints como existentes.' },
    { role: 'user', content: `Tipo: ${type}\nInstrucción: ${instruction}\n\n${context}` },
  ], signal);
}
