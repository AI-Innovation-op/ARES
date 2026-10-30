import { AresError, requireText } from '../../shared/domain/errors.js';
import { SourcePath } from '../../workspace/domain/source-path.js';

/** A working reference domain, not an inferred implementation of arbitrary requirements. */
export function forgeProject(name: string, context = 'tasks'): Readonly<Record<string, string>> {
  requireText(name, 'Nombre', 100);
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(context))
    throw new AresError(
      'VALIDATION',
      'El contexto debe ser un identificador en minúsculas de hasta 31 caracteres.',
    );
  new SourcePath(context);
  const base = `src/${context}`;
  return Object.freeze({
    'package.json':
      JSON.stringify(
        {
          name: 'ares-ddd-project',
          version: '0.1.0',
          private: true,
          type: 'module',
          description: name,
          engines: { node: '>=24.0.0' },
          scripts: {
            start: 'node src/main.ts',
            test: 'node --test test/*.test.ts',
            typecheck: 'tsc --noEmit',
          },
          devDependencies: { '@types/node': '^24.0.0', typescript: '^5.8.3' },
        },
        null,
        2,
      ) + '\n',
    'tsconfig.json':
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            noEmit: true,
            allowImportingTsExtensions: true,
            erasableSyntaxOnly: true,
          },
          include: ['src/**/*.ts', 'test/**/*.ts'],
        },
        null,
        2,
      ) + '\n',
    '.gitignore': 'node_modules/\n.data/\n.env\n*.log\n',
    [`${base}/domain/task.ts`]: `export class TaskTitle {
  readonly value: string;
  constructor(value: string) {
    const title = value.trim();
    if (!title || title.length > 120) throw new Error('El título requiere entre 1 y 120 caracteres.');
    this.value = title;
    Object.freeze(this);
  }
}

export interface TaskData { readonly id: string; readonly title: string; readonly status: 'pending' | 'completed' }

export class Task {
  readonly data: Readonly<TaskData>;
  constructor(data: TaskData) {
    if (!data.id.trim() || !['pending', 'completed'].includes(data.status)) throw new Error('Tarea inválida.');
    this.data = Object.freeze({ ...data, title: new TaskTitle(data.title).value });
  }
  complete(): Task {
    if (this.data.status !== 'pending') throw new Error('La tarea ya está completada.');
    return new Task({ ...this.data, status: 'completed' });
  }
}
`,
    [`${base}/application/task-service.ts`]: `import { Task, TaskTitle } from '../domain/task.ts';

export interface TaskRepository {
  save(task: Task): void;
  find(id: string): Task | undefined;
  all(): readonly Task[];
}

export class TaskService {
  private readonly repository: TaskRepository;
  private readonly nextId: () => string;
  constructor(repository: TaskRepository, nextId: () => string) { this.repository = repository; this.nextId = nextId; }
  add(title: string): Task {
    const task = new Task({ id: this.nextId(), title: new TaskTitle(title).value, status: 'pending' });
    this.repository.save(task);
    return task;
  }
  complete(id: string): Task {
    const task = this.repository.find(id);
    if (!task) throw new Error('Tarea no encontrada.');
    const completed = task.complete();
    this.repository.save(completed);
    return completed;
  }
  list(): readonly Task[] { return this.repository.all(); }
}
`,
    [`${base}/infrastructure/sqlite-tasks.ts`]: `import { DatabaseSync } from 'node:sqlite';
import { Task, type TaskData } from '../domain/task.ts';
import type { TaskRepository } from '../application/task-service.ts';

export class SqliteTasks implements TaskRepository {
  private readonly db: DatabaseSync;
  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec('CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL) STRICT');
  }
  save(task: Task): void {
    const t = task.data;
    this.db.prepare('INSERT INTO tasks VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, status = excluded.status').run(t.id, t.title, t.status);
  }
  find(id: string): Task | undefined {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return row ? new Task(row as unknown as TaskData) : undefined;
  }
  all(): readonly Task[] { return this.db.prepare('SELECT * FROM tasks ORDER BY rowid').all().map(row => new Task(row as unknown as TaskData)); }
  close(): void { this.db.close(); }
}
`,
    'src/main.ts': `import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { TaskService } from './${context}/application/task-service.ts';
import { SqliteTasks } from './${context}/infrastructure/sqlite-tasks.ts';

const dataDir = path.resolve(process.env.APP_DATA_DIR || '.data');
fs.mkdirSync(dataDir, { recursive: true });
const repository = new SqliteTasks(path.join(dataDir, 'tasks.sqlite'));
const service = new TaskService(repository, randomUUID);
try {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'add') console.log(JSON.stringify(service.add(args.join(' ')).data));
  else if (command === 'complete') console.log(JSON.stringify(service.complete(args[0] || '').data));
  else if (command === 'list') console.log(JSON.stringify(service.list().map(t => t.data), null, 2));
  else console.log('Comandos: add "título" | list | complete <id>');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Error inesperado.');
  process.exitCode = 1;
} finally { repository.close(); }
`,
    'test/tasks.test.ts': `import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Task, TaskTitle } from '../${base}/domain/task.ts';
import { TaskService } from '../${base}/application/task-service.ts';
import { SqliteTasks } from '../${base}/infrastructure/sqlite-tasks.ts';

test('el título conserva su invariante y normaliza espacios', () => {
  assert.equal(new TaskTitle('  Primera tarea  ').value, 'Primera tarea');
  for (const title of ['', '   ', 'x'.repeat(121)]) assert.throws(() => new TaskTitle(title));
});

test('completar conserva el original y rechaza una segunda finalización', () => {
  const pending = new Task({ id: 'task-1', title: 'Probar el dominio', status: 'pending' });
  const completed = pending.complete();
  assert.equal(pending.data.status, 'pending');
  assert.equal(completed.data.status, 'completed');
  assert.throws(() => completed.complete(), /ya está/);
});

test('el caso de uso persiste y recupera una tarea desde otra conexión SQLite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ares-starter-'));
  let repo: SqliteTasks | undefined;
  try {
    const file = path.join(dir, 'tasks.sqlite');
    repo = new SqliteTasks(file);
    const service = new TaskService(repo, () => 'task-1');
    service.add('Preparar entrega');
    service.complete('task-1');
    assert.throws(() => service.complete('missing'), /no encontrada/);
    repo.close(); repo = new SqliteTasks(file);
    assert.equal(repo.find('task-1')?.data.status, 'completed');
    assert.equal(repo.all().length, 1);
  } finally { repo?.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
`,
    'README.md': `# ${name.replace(/[\r\n]/g, ' ')}\n\nPlantilla CLI DDD creada por ARES. Dominio de ejemplo: seguimiento de tareas.\n\nRequisito: Node.js 24 o superior. Ejecución y tests sin instalar dependencias:\n\n\`\`\`cmd\nnode src/main.ts add "Preparar primera entrega"\nnode src/main.ts list\nnode src/main.ts complete ID\nnode --test test/*.test.ts\n\`\`\`\n\nPara comprobar tipos: \`npm install\` y \`npm run typecheck\`.\n\nEl contexto \`${context}\` separa dominio puro, casos de uso y SQLite.\nEl título admite 1–120 caracteres; una tarea solo puede completarse una vez.\nLos datos se guardan en \`.data/tasks.sqlite\` (o \`APP_DATA_DIR\`).\nAdapta el lenguaje y las invariantes a tu negocio antes de ampliar el modelo.\n\nLos tests prueban reglas del dominio y persistencia real. No se generan métricas ficticias.\n`,
    'docs/adr/0001-cli-ddd.md':
      '# ADR 0001: CLI con dominio puro y persistencia local\n\nEstado: aceptado.\n\nContexto: una aplicación pequeña necesita reglas comprobables y ejecución desde terminal.\n\nDecisión: monolito modular con dominio inmutable, casos de uso y adaptador SQLite. Node.js ejecuta TypeScript con sintaxis eliminable.\n\nConsecuencias: funciona sin servidor ni dependencias de ejecución; la comprobación de tipos es un paso independiente. SQLite es infraestructura y no entra al dominio. No se introducen CQRS, un bus de eventos ni microservicios sin necesidad de negocio.\n',
  });
}
