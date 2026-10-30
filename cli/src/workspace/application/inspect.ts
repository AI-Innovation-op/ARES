import type { Snapshot } from '../domain/source-path.js';

export interface WorkspaceReader {
  scan(target: string): Snapshot;
}

export interface Finding {
  readonly rule: string;
  readonly severity: 'high' | 'medium';
  readonly path: string;
  readonly line: number;
  readonly message: string;
}

const RULES: readonly { rule: string; severity: Finding['severity']; pattern: RegExp; message: string }[] = [
  { rule: 'dynamic-eval', severity: 'high', pattern: /\beval\s*\(/, message: 'eval ejecuta texto como código; comprueba el origen de la entrada.' },
  { rule: 'shell-execution', severity: 'medium', pattern: /(?:^|[^.\w])(?:exec|execSync)\s*\(/, message: 'Posible ejecución mediante shell: revisa el origen de la función y las interpolaciones.' },
  { rule: 'raw-html', severity: 'medium', pattern: /(?:\.innerHTML\s*=|v-html\s*=|dangerouslySetInnerHTML)/, message: 'HTML sin escape: verifica sanitización antes de insertar contenido.' },
  { rule: 'embedded-secret', severity: 'high', pattern: /(?:\b(?:api[_-]?key|password|secret|token)\b\s*[:=]\s*["'][^"'\s]{12,}["']|\b(?:sk-or-v1-|ghp_|github_pat_|AIza)[A-Za-z0-9_-]{20,})/i, message: 'Posible credencial literal; revisa y externaliza el valor.' },
];

/** Deterministic signals with source locations, never a security certification. */
export function inspect(snapshot: Snapshot): { snapshot: Omit<Snapshot, 'files'>; files: number; findings: Finding[]; limitations: string[] } {
  const findings: Finding[] = [];
  for (const file of snapshot.files) {
    if (!/\.(?:[cm]?[jt]sx?|vue|html|py|go|java|cs|rb|php|sh)$/i.test(file.path)) continue;
    file.content.split(/\r?\n/).forEach((line, index) => {
      for (const rule of RULES) {
        if (rule.pattern.test(line)) findings.push({ rule: rule.rule, severity: rule.severity, path: file.path, line: index + 1, message: rule.message });
      }
    });
  }
  const { files, ...metadata } = snapshot;
  return {
    snapshot: metadata, files: files.length, findings,
    limitations: ['Análisis heurístico: requiere revisión humana; puede producir falsos positivos.', 'No ejecuta pruebas, no mide Big-O ni cobertura y no consulta vulnerabilidades de dependencias.', 'Se omiten archivos privados, ignorados, binarios, enlaces y archivos que excedan los límites.'],
  };
}
