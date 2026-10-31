import { localBudget, type LocalModelInfo, type LocalResources } from '../domain/local-budget.js';

export interface LocalEngine {
  version(signal?: AbortSignal): Promise<string>;
  models(signal?: AbortSignal): Promise<readonly Omit<LocalModelInfo, 'maxContext'>[]>;
  model(name: string, signal?: AbortSignal): Promise<LocalModelInfo>;
  resources(): Promise<LocalResources>;
}
export async function prepareLocal(
  engine: LocalEngine,
  name: string,
  context?: number,
  output?: number,
  signal?: AbortSignal,
) {
  const model = await engine.model(name, signal);
  const resources = await engine.resources();
  return { model, resources, budget: localBudget(resources, model, context, output) };
}
