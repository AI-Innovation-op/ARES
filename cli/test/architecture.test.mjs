import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { AnalyzeArchitecture } from '../dist/architecture/application/analyze-architecture.js';
import { TypeScriptImports } from '../dist/infrastructure/typescript-imports.js';
import { LocalWorkspace } from '../dist/infrastructure/workspace.js';
import { temporary, write, run, cliRoot } from './helpers.mjs';

function analyze(root) {
  return new AnalyzeArchitecture(new TypeScriptImports()).execute(new LocalWorkspace().scan(root));
}

test('AST analysis finds real domain/application violations and ignores code inside strings', (t) => {
  const root = temporary(t);
  write(
    root,
    'src/orders/domain/order.ts',
    `import fs from 'node:fs';\nimport { repo } from '../infrastructure/repo.js';\nconst example = "import fake from 'express'";`,
  );
  write(root, 'src/orders/infrastructure/repo.ts', 'export const repo = 1;');
  write(
    root,
    'src/orders/application/create.ts',
    "import fs from 'fs'; import { repo } from '../infrastructure/repo.js';",
  );
  const report = analyze(root);
  assert.equal(report.analyzedModules, 3);
  assert.equal(report.violations.length, 4);
  assert.ok(
    report.violations.some(
      (v) => v.path.endsWith('domain/order.ts') && v.line === 1 && v.dependency === 'node:fs',
    ),
  );
  assert.ok(report.violations.some((v) => v.line === 2 && v.rule === 'domain-outward-dependency'));
  assert.ok(!report.violations.some((v) => v.dependency === 'express'));
  assert.deepEqual(report.parseIssues, []);
});

test('TypeScript aliases, type imports, re-exports and CommonJS edges are resolved within the snapshot', (t) => {
  const root = temporary(t);
  write(
    root,
    'tsconfig.json',
    JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } } }),
  );
  write(
    root,
    'src/sales/domain/order.ts',
    "export type { Repo } from '@/sales/infrastructure/repo.js';\nimport type { Stats } from 'node:fs';",
  );
  write(root, 'src/sales/infrastructure/repo.ts', 'export interface Repo {}');
  write(root, 'src/entry.cjs', "const repo = require('./sales/infrastructure/repo.js');");
  const report = analyze(root);
  assert.deepEqual(report.unresolved, []);
  const domain = report.modules.find((m) => m.path.endsWith('domain/order.ts'));
  assert.ok(domain.dependencies.every((d) => d.typeOnly));
  assert.equal(report.violations.length, 2);
  assert.equal(
    report.modules.find((m) => m.path.endsWith('entry.cjs')).dependencies[0].target,
    'src/sales/infrastructure/repo.ts',
  );
});

test('cycles are groups of resolved imports, including a self import', (t) => {
  const root = temporary(t);
  write(root, 'a.ts', "export { b } from './b.js';");
  write(root, 'b.ts', "import './a.js'; export const b = 1;");
  write(root, 'self.ts', "import('./self.js');");
  assert.deepEqual(analyze(root).cycles, [['a.ts', 'b.ts'], ['self.ts']]);
});

test('Vue script blocks retain source line locations and JSX without interpreting the template', (t) => {
  const root = temporary(t);
  write(
    root,
    'domain/Widget.vue',
    '<template><p>hello</p></template>\n<script setup lang="tsx">\nimport fs from "node:fs";\nimport Other from "./Other.vue";\nconst view = <p>Hi</p>;\n</script>',
  );
  write(root, 'domain/Other.vue', '<script setup>export const other = true;</script>');
  const report = analyze(root);
  assert.equal(report.violations[0].line, 3);
  assert.deepEqual(report.parseIssues, []);
  assert.equal(
    report.modules.find((m) => m.path.endsWith('Widget.vue')).dependencies[1].target,
    'domain/Other.vue',
  );
});

test('omitted sources and unknown aliases stay unresolved and unsupported languages are disclosed', (t) => {
  const root = temporary(t);
  write(root, '.gitignore', 'hidden.ts\n');
  write(root, 'hidden.ts', 'export const hidden = 1;');
  write(root, 'domain/entity.ts', "import '../hidden.js'; import '@/unknown';");
  write(root, 'worker.py', 'print("not parsed")');
  const report = analyze(root);
  assert.equal(report.unresolved.length, 2);
  assert.equal(report.violations.length, 0);
  assert.deepEqual(report.unsupportedFiles, ['worker.py']);
});

test('CLI analysis writes reviewable reports, fails on requested conditions and rejects overwrites', (t) => {
  const root = temporary(t),
    home = temporary(t),
    output = path.join(home, 'analysis.json');
  write(root, 'domain/a.ts', "import fs from 'node:fs';");
  const result = run(['analyze', root, '--fail-on', 'violation', '--json', '-o', output], home);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).violations.length, 1);
  assert.equal(run(['analyze', root, '--json', '-o', output], home).status, 1);
  write(root, 'domain/a.ts', 'const broken = ;');
  assert.equal(run(['analyze', root, '--fail-on', 'parse', '--json'], home).status, 1);
  write(root, 'domain/a.ts', "import './missing.js';");
  const incomplete = run(['analyze', root, '--fail-on', 'any', '--json'], home);
  assert.equal(incomplete.status, 1);
  assert.equal(JSON.parse(incomplete.stdout).unresolved.length, 1);
  write(root, 'other.py', 'print(1)');
  const readable = run(['analyze', root], home);
  assert.ok(readable.stdout.includes('Lenguaje no analizado: other.py'));
  assert.ok(!readable.stdout.includes('Sin coincidencias'));
});

test('ARES source follows its own AST boundary rules without unresolved imports or cycles', (t) => {
  const result = run(
    ['analyze', path.join(cliRoot, 'src'), '--fail-on', 'any', '--json'],
    temporary(t),
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.analyzedModules >= 30);
  assert.deepEqual(report.violations, []);
  assert.deepEqual(report.cycles, []);
  assert.deepEqual(report.unresolved, []);
});
