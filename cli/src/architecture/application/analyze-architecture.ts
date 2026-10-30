import type { Snapshot } from '../../shared/domain/source-path.js';
import {
  contextOf,
  dependencyCycles,
  dependencyViolations,
  layerOf,
  type ArchitectureFacts,
} from '../domain/architecture.js';

export interface SourceAnalyzer {
  parse(snapshot: Snapshot): ArchitectureFacts;
}

export class AnalyzeArchitecture {
  constructor(private readonly analyzer: SourceAnalyzer) {}
  execute(snapshot: Snapshot) {
    const facts = this.analyzer.parse(snapshot);
    const violations = facts.modules.flatMap(dependencyViolations);
    const cycles = dependencyCycles(facts.modules);
    const contexts = new Map<
      string,
      { name: string; modules: number; layers: Record<string, number> }
    >();
    for (const module of facts.modules) {
      const name = contextOf(module.path),
        layer = layerOf(module.path);
      const context = contexts.get(name) || { name, modules: 0, layers: {} };
      context.modules++;
      context.layers[layer] = (context.layers[layer] || 0) + 1;
      contexts.set(name, context);
    }
    return {
      root: snapshot.root,
      sourceFiles: snapshot.files.length,
      analyzedModules: facts.modules.length,
      skipped: snapshot.skipped,
      truncated: snapshot.truncated,
      contexts: [...contexts.values()].sort((a, b) => a.name.localeCompare(b.name, 'en')),
      violations,
      cycles,
      parseIssues: facts.parseIssues,
      unsupportedFiles: facts.unsupportedFiles,
      unresolved: facts.modules.flatMap((module) =>
        module.dependencies
          .filter((d) => d.kind === 'unresolved')
          .map((d) => ({ path: module.path, line: d.line, specifier: d.specifier })),
      ),
      modules: facts.modules,
      limitations: [
        'Análisis estático de JS, TS y bloques script de Vue; no ejecuta ni compila el proyecto.',
        'Las capas y contextos se infieren de los directorios. Solo se resuelven fuentes presentes en la instantánea y opciones locales de tsconfig.',
        'Imports dinámicos calculados, configuración heredada y dependencias omitidas requieren revisión. No es una certificación DDD ni de seguridad.',
      ],
    };
  }
}
