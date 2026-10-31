import { complete, type LanguageModel } from '../../shared/application/ports.js';

export const EVALUATION_TASKS = [
  {
    id: 'stock-invariant',
    prompt:
      'Un agregado tiene stock=3. reserve(4) debe rechazar sin mutar stock. Devuelve exclusivamente JSON con accepted y remaining.',
    expected: { accepted: false, remaining: 3 },
  },
  {
    id: 'idempotent-command',
    prompt:
      'El saldo inicial es 10. Se procesa dos veces el mismo comando id="x" para sumar 5. La regla es idempotencia por id de comando. Devuelve exclusivamente JSON con balance y appliedCommands (cantidad de comandos aplicados).',
    expected: { balance: 15, appliedCommands: 1 },
  },
  {
    id: 'javascript-boundary',
    prompt:
      'Para JavaScript: const items=[10,20,30,40]; const result=items.slice(1,3); Devuelve exclusivamente JSON con result y originalLength. No ejecutes herramientas.',
    expected: { result: [20, 30], originalLength: 4 },
  },
] as const;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export async function evaluateModels(
  targets: readonly { label: string; create(signal?: AbortSignal): Promise<LanguageModel> }[],
  repetitions: number,
  signal?: AbortSignal,
) {
  const results: {
    target: string;
    model?: string;
    task: string;
    run: number;
    passed: boolean;
    durationMs: number;
    answer?: string;
    error?: string;
    usage?: LanguageModel['usage'];
  }[] = [];
  for (let run = 1; run <= repetitions; run++)
    for (const task of EVALUATION_TASKS)
      for (const target of targets) {
        signal?.throwIfAborted();
        const start = performance.now();
        try {
          const model = await target.create(signal);
          const answer = await complete(
            model,
            [
              {
                role: 'system',
                content:
                  'Resuelve la tarea y devuelve únicamente el JSON solicitado, sin explicaciones.',
              },
              { role: 'user', content: task.prompt },
            ],
            signal,
          );
          let passed = false;
          try {
            passed =
              canonical(
                JSON.parse(
                  answer
                    .trim()
                    .replace(/^```(?:json)?\s*/, '')
                    .replace(/\s*```$/, ''),
                ),
              ) === canonical(task.expected);
          } catch {
            /* Invalid structured output fails the task. */
          }
          results.push({
            target: target.label,
            model: model.name,
            task: task.id,
            run,
            passed,
            durationMs: performance.now() - start,
            answer,
            usage: { ...model.usage },
          });
        } catch {
          if (signal?.aborted) throw signal.reason;
          results.push({
            target: target.label,
            task: task.id,
            run,
            passed: false,
            durationMs: performance.now() - start,
            error:
              'La solicitud falló; revisa motor, límites o cuota. No se incluyen respuestas de error del proveedor.',
          });
        }
      }
  return {
    version: 1,
    suite: 'ares-engineering-mini-v1',
    at: new Date().toISOString(),
    scope:
      'Tres tareas sintéticas con resultado JSON verificable. No mide calidad general de programación ni ejecuta código generado.',
    repetitions,
    tasks: EVALUATION_TASKS,
    results,
    summary: targets.map((target) => {
      const rows = results.filter((row) => row.target === target.label);
      return {
        target: target.label,
        passed: rows.filter((row) => row.passed).length,
        total: rows.length,
        averageMs: rows.reduce((sum, row) => sum + row.durationMs, 0) / rows.length,
      };
    }),
  };
}
