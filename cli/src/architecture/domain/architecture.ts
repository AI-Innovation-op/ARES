export type Layer = 'domain' | 'application' | 'infrastructure' | 'presentation' | 'unclassified';
export interface Dependency {
  readonly specifier: string;
  readonly line: number;
  readonly kind: 'internal' | 'external' | 'platform' | 'unresolved';
  readonly target?: string;
  readonly typeOnly: boolean;
}
export interface ModuleFacts {
  readonly path: string;
  readonly dependencies: readonly Dependency[];
}
export interface ParseIssue {
  readonly path: string;
  readonly line: number;
  readonly message: string;
}
export interface ArchitectureFacts {
  readonly modules: readonly ModuleFacts[];
  readonly unsupportedFiles: readonly string[];
  readonly parseIssues: readonly ParseIssue[];
}
export interface ArchitectureViolation {
  readonly rule: string;
  readonly path: string;
  readonly line: number;
  readonly dependency: string;
  readonly message: string;
}

export function layerOf(path: string): Layer {
  const segments = path.split('/');
  for (const layer of ['domain', 'application', 'infrastructure', 'presentation'] as const)
    if (segments.includes(layer)) return layer;
  return 'unclassified';
}

export function contextOf(path: string): string {
  const segments = path.split('/');
  const index = segments.indexOf(layerOf(path));
  return index > 0 && segments[index - 1] !== 'src' ? segments[index - 1] : 'root';
}

export function dependencyViolations(module: ModuleFacts): ArchitectureViolation[] {
  const source = layerOf(module.path);
  const violations: ArchitectureViolation[] = [];
  for (const dependency of module.dependencies) {
    const target = dependency.target ? layerOf(dependency.target) : 'unclassified';
    let rule = '',
      message = '';
    if (source === 'domain' && (dependency.kind === 'platform' || dependency.kind === 'external')) {
      rule = 'domain-external-dependency';
      message = 'El dominio importa una dependencia de plataforma o proveedor.';
    } else if (
      source === 'domain' &&
      ['application', 'infrastructure', 'presentation'].includes(target)
    ) {
      rule = 'domain-outward-dependency';
      message = `El dominio depende de la capa ${target}.`;
    } else if (
      source === 'application' &&
      (dependency.kind === 'platform' || ['infrastructure', 'presentation'].includes(target))
    ) {
      rule = 'application-outward-dependency';
      message = 'El caso de uso depende de plataforma o de un adaptador concreto.';
    }
    if (rule)
      violations.push({
        rule,
        path: module.path,
        line: dependency.line,
        dependency: dependency.specifier,
        message,
      });
  }
  return violations;
}

/** Strongly connected components over imports actually resolved in the snapshot. */
export function dependencyCycles(modules: readonly ModuleFacts[]): readonly string[][] {
  const graph = new Map(
    modules.map((module) => [
      module.path,
      module.dependencies.flatMap((dependency) =>
        dependency.kind === 'internal' && dependency.target ? [dependency.target] : [],
      ),
    ]),
  );
  const indexes = new Map<string, number>(),
    low = new Map<string, number>(),
    stack: string[] = [],
    active = new Set<string>(),
    cycles: string[][] = [];
  let next = 0;
  const visit = (name: string) => {
    indexes.set(name, next);
    low.set(name, next++);
    stack.push(name);
    active.add(name);
    for (const target of graph.get(name) || []) {
      if (!graph.has(target)) continue;
      if (!indexes.has(target)) {
        visit(target);
        low.set(name, Math.min(low.get(name)!, low.get(target)!));
      } else if (active.has(target)) low.set(name, Math.min(low.get(name)!, indexes.get(target)!));
    }
    if (low.get(name) === indexes.get(name)) {
      const component: string[] = [];
      let item: string;
      do {
        item = stack.pop()!;
        active.delete(item);
        component.push(item);
      } while (item !== name);
      if (component.length > 1 || graph.get(name)?.includes(name)) cycles.push(component.sort());
    }
  };
  for (const module of modules) if (!indexes.has(module.path)) visit(module.path);
  return cycles.sort((a, b) => a[0].localeCompare(b[0], 'en'));
}
