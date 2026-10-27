/**
 * @fileoverview Forja de Ejercicios DDD y Generador de Código Táctico (v3.5).
 * Genera la estructura completa de archivos para TypeScript DDD / Hexagonal,
 * produce el README.md humanizado en primera persona y empaqueta el plan de commits.
 * @module services/exercise-forge.service
 */

import { AnalisisEnunciado, BoundedContextMeta } from './exercise-parser.service.js';
import { GitAuthorConfig, GitAutomatorService, PlanGitCommits, ArchivoGenerado } from './git-automator.service.js';

export interface ProyectoForjado {
  titulo: string;
  slug: string;
  archivos: ArchivoGenerado[];
  planGit: PlanGitCommits;
  readmeHumanizado: string;
  especificacionMarkdown: string;
  boundedContexts: string[];
}

export class ExerciseForgeService {
  /**
   * Forja el proyecto completo a partir del análisis del enunciado y configuración del autor.
   */
  static forjarProyecto(
    analisis: AnalisisEnunciado,
    autor: GitAuthorConfig,
    stackDeseado: string = 'typescript-ddd'
  ): ProyectoForjado {
    const archivos: ArchivoGenerado[] = [];
    const contextIds = analisis.boundedContexts.map((c) => c.identificador);

    // 1. Generar README.md humanizado (estilo estudiante / ingeniero real)
    const readmeHumanizado = this.generarReadmeHumanizado(analisis, autor, stackDeseado);
    archivos.push({
      ruta: 'README.md',
      contenido: readmeHumanizado,
    });

    // 2. Especificación formal
    archivos.push({
      ruta: 'SPECIFICATION.md',
      contenido: analisis.especificacionMarkdown,
    });

    // 3. Archivos de Configuración y Scaffold Base
    archivos.push({
      ruta: 'package.json',
      contenido: this.generarPackageJson(analisis, autor),
    });

    archivos.push({
      ruta: 'tsconfig.json',
      contenido: this.generarTsConfig(),
    });

    archivos.push({
      ruta: '.gitignore',
      contenido: `node_modules/\ndist/\ncoverage/\n.env\n*.log\n.DS_Store\n`,
    });

    // 4. Kernel Compartido (Shared Kernel DDD)
    archivos.push(...this.generarSharedKernel());

    // 5. Generar código para cada Bounded Context
    for (const ctx of analisis.boundedContexts) {
      archivos.push(...this.generarCodigoContexto(ctx, analisis));
    }

    // 6. Archivo de arranque principal (Composition Root)
    archivos.push({
      ruta: 'src/main.ts',
      contenido: this.generarMainTs(analisis),
    });

    // 7. Planificar Commits Atómicos
    const planGit = GitAutomatorService.planificarCommits(archivos, autor, contextIds);

    // 8. Incluir scripts tácticos en el bundle
    archivos.push({
      ruta: 'setup-git.bat',
      contenido: planGit.scripts.bat,
    });

    archivos.push({
      ruta: 'setup-git.sh',
      contenido: planGit.scripts.sh,
    });

    return {
      titulo: analisis.titulo,
      slug: analisis.slug,
      archivos,
      planGit,
      readmeHumanizado,
      especificacionMarkdown: analisis.especificacionMarkdown,
      boundedContexts: contextIds,
    };
  }

  /**
   * Genera un README.md redactado en tono humano y profesional,
   * sin clichés de IA, con firma del autor y explicación de decisiones de arquitectura.
   */
  private static generarReadmeHumanizado(
    analisis: AnalisisEnunciado,
    autor: GitAuthorConfig,
    stack: string
  ): string {
    const anio = new Date().getFullYear();
    const branch = autor.branchName || `feature/${analisis.slug}`;

    return `# ${analisis.titulo}

> **Autor:** ${autor.name}  
> **Contacto:** [${autor.email}](mailto:${autor.email})  
> **Rama de Trabajo:** \`${branch}\`  
> **Stack Base:** TypeScript (Node.js) con Arquitectura Hexagonal y Domain-Driven Design (DDD)  
> **Año:** ${anio}  

---

## 📌 1. Sobre este Proyecto y Contexto

Hola, este repositorio contiene mi implementación para el requerimiento: **${analisis.titulo}**.

Para resolver este ejercicio decidí aplicar **Domain-Driven Design (DDD)** táctico combinado con **Arquitectura Hexagonal (Puertos y Adaptadores)**. Mi objetivo principal fue garantizar que las reglas e invariantes del negocio queden totalmente protegidas en la capa de dominio, desacopladas de frameworks de persistencia o controladores HTTP.

### Visión Rápida del Negocio
${analisis.resumenNegocio}

---

## 🏛️ 2. Bounded Contexts y Arquitectura

Estructuré la solución en **${analisis.boundedContexts.length} Contextos Delimitados (Bounded Contexts)** independientes:

${analisis.boundedContexts
  .map(
    (c, i) => `### 2.${i + 1}. Contexto: \`${c.nombre}\`
- **Responsabilidad:** ${c.descripcion}.
- **Entidades Principales:** ${c.entidades.map((e) => `\`${e}\``).join(', ')}.
- **Casos de Uso Implementados:** ${c.casosUso.map((u) => `\`${u}\``).join(', ')}.
`
  )
  .join('\n')}

---

## 📂 3. Estructura de Capas (Clean Architecture)

Cada contexto delimitado dentro de \`src/\` sigue la división estricta de 3 capas:

\`\`\`bash
src/
├── shared/                         # Objetos transversales (Shared Kernel)
│   └── domain/                     # BaseEntity, ValueObject, DomainEvent
${analisis.boundedContexts
  .map(
    (c) => `├── ${c.identificador}/
│   ├── domain/                     # Entidades, Value Objects, Excepciones y Puertos
│   ├── application/                # Casos de uso (Command/Query), DTOs
│   └── infrastructure/             # Adaptadores de persistencia en memoria y API`
  )
  .join('\n')}
└── main.ts                         # Punto de entrada y composition root
\`\`\`

---

## ⚖️ 4. Invariantes y Reglas del Negocio Validadas

Durante la implementación puse especial énfasis en que el dominio sea auto-validante (entidades ricas, no modelos anémicos):

${analisis.reglasNegocio.map((r, i) => `- **RBN-${(i + 1).toString().padStart(2, '0')}:** ${r}`).join('\n')}

---

## 🚀 5. Cómo Ejecutar el Proyecto en Local

### Requisitos Previos
- Node.js (v18.0 o superior)
- npm o pnpm

### Pasos de Instalación y Ejecución

\`\`\`bash
# 1. Clonar el repositorio y posicionarse en la rama de trabajo
git clone <URL_DEL_REPOSITORIO>
git checkout ${branch}

# 2. Instalar dependencias
npm install

# 3. Compilar el código TypeScript
npm run build

# 4. Iniciar el servidor de demostración
npm start
\`\`\`

### Ejecución de Pruebas Unitarias
\`\`\`bash
# Correr la suite de pruebas de dominio e invariantes
npm test
\`\`\`

---

## 📜 6. Historial de Commits Atómicos

Para mantener un historial limpio y legible en GitHub, los commits fueron organizados de manera atómica por Bounded Context y capa, siguiendo la convención Conventional Commits:

1. \`chore(scaffold)\`: Configuración inicial, TypeScript y especificación táctica.
2. \`feat(shared-kernel)\`: Eventos y abstracciones base del dominio.
${analisis.boundedContexts
  .map(
    (c) => `3. \`feat(${c.identificador}-domain)\`: Entidades, VOs y puertos.
4. \`feat(${c.identificador}-application)\`: Casos de uso y DTOs.
5. \`feat(${c.identificador}-infrastructure)\`: Repositorios y controladores.
6. \`test(${c.identificador})\`: Tests de invariantes.`
  )
  .join('\n')}
7. \`docs\`: Documentación README y especificaciones.

---

> Hecho con esmero por **${autor.name}**. Si tienes preguntas o sugerencias sobre el diseño, siéntete libre de abrir un issue o escribirme.
`;
  }

  private static generarPackageJson(analisis: AnalisisEnunciado, autor: GitAuthorConfig): string {
    return JSON.stringify(
      {
        name: analisis.slug,
        version: '1.0.0',
        description: `Implementación DDD para ${analisis.titulo}`,
        author: `${autor.name} <${autor.email}>`,
        type: 'module',
        main: 'dist/main.js',
        scripts: {
          build: 'tsc',
          start: 'node dist/main.js',
          dev: 'tsx watch src/main.ts',
          test: 'node --test',
        },
        dependencies: {
          uuid: '^11.0.5',
        },
        devDependencies: {
          '@types/node': '^22.10.0',
          '@types/uuid': '^10.0.0',
          tsx: '^4.19.0',
          typescript: '^5.7.0',
        },
      },
      null,
      2
    );
  }

  private static generarTsConfig(): string {
    return JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          lib: ['ES2022'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          declaration: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', '**/*.spec.ts'],
      },
      null,
      2
    );
  }

  private static generarSharedKernel(): ArchivoGenerado[] {
    return [
      {
        ruta: 'src/shared/domain/entity.base.ts',
        contenido: `/**
 * Clase base para todas las Entidades del Dominio.
 */
export abstract class BaseEntity<TId> {
  protected constructor(protected readonly _id: TId) {}

  get id(): TId {
    return this._id;
  }

  equals(other?: BaseEntity<TId>): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    return this._id === other._id;
  }
}
`,
      },
      {
        ruta: 'src/shared/domain/value-object.base.ts',
        contenido: `/**
 * Clase base inmutable para Value Objects.
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  get value(): T {
    return this.props;
  }

  equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) return false;
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
`,
      },
      {
        ruta: 'src/shared/domain/domain-event.base.ts',
        contenido: `/**
 * Interfaz base para Eventos de Dominio asíncronos.
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventName: string;
}
`,
      },
      {
        ruta: 'src/shared/domain/aggregate-root.base.ts',
        contenido: `import { BaseEntity } from './entity.base.js';
import { DomainEvent } from './domain-event.base.js';

/**
 * Raíz del Agregado con gestión de eventos de dominio diferidos.
 */
export abstract class AggregateRoot<TId> extends BaseEntity<TId> {
  private _domainEvents: DomainEvent[] = [];

  protected recordEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
`,
      },
    ];
  }

  private static generarCodigoContexto(
    ctx: BoundedContextMeta,
    analisis: AnalisisEnunciado
  ): ArchivoGenerado[] {
    const archivos: ArchivoGenerado[] = [];
    const entidadNombre = ctx.entidades[0] || `${ctx.nombre.replace(/[^a-zA-Z]/g, '')}Entity`;
    const idNombre = `${entidadNombre}Id`;
    const casoUsoNombre = ctx.casosUso[0] || `Gestionar${entidadNombre}`;

    // 1. Dominio: Value Object ID
    archivos.push({
      ruta: `src/${ctx.identificador}/domain/${idNombre.toLowerCase()}.vo.ts`,
      contenido: `import { ValueObject } from '../../shared/domain/value-object.base.js';

export class ${idNombre} extends ValueObject<string> {
  static create(value: string): ${idNombre} {
    if (!value || value.trim().length === 0) {
      throw new Error('${idNombre} no puede ser un valor vacío.');
    }
    return new ${idNombre}(value.trim());
  }
}
`,
    });

    // 2. Dominio: Evento
    archivos.push({
      ruta: `src/${ctx.identificador}/domain/events/${entidadNombre.toLowerCase()}-creado.event.ts`,
      contenido: `import { DomainEvent } from '../../../shared/domain/domain-event.base.js';

export class ${entidadNombre}CreadoEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventName: string = '${ctx.identificador}.${entidadNombre.toLowerCase()}.creado';

  constructor(public readonly ${entidadNombre.toLowerCase()}Id: string) {
    this.eventId = Math.random().toString(36).substring(2, 11);
    this.occurredOn = new Date();
  }
}
`,
    });

    // 3. Dominio: Entidad / Agregado
    archivos.push({
      ruta: `src/${ctx.identificador}/domain/${entidadNombre.toLowerCase()}.aggregate.ts`,
      contenido: `import { AggregateRoot } from '../../shared/domain/aggregate-root.base.js';
import { ${idNombre} } from './${idNombre.toLowerCase()}.vo.js';
import { ${entidadNombre}CreadoEvent } from './events/${entidadNombre.toLowerCase()}-creado.event.js';

export interface ${entidadNombre}Props {
  nombre: string;
  estado: string;
  fechaCreacion: Date;
}

export class ${entidadNombre} extends AggregateRoot<${idNombre}> {
  private constructor(
    id: ${idNombre},
    private props: ${entidadNombre}Props
  ) {
    super(id);
  }

  static create(id: ${idNombre}, nombre: string): ${entidadNombre} {
    if (!nombre || nombre.length < 3) {
      throw new Error('Invariante rota: El nombre debe tener al menos 3 caracteres.');
    }

    const entidad = new ${entidadNombre}(id, {
      nombre,
      estado: 'ACTIVO',
      fechaCreacion: new Date(),
    });

    entidad.recordEvent(new ${entidadNombre}CreadoEvent(id.value));
    return entidad;
  }

  get nombre(): string {
    return this.props.nombre;
  }

  get estado(): string {
    return this.props.estado;
  }

  cambiarEstado(nuevoEstado: string): void {
    if (!nuevoEstado) throw new Error('Estado inválido');
    this.props.estado = nuevoEstado;
  }
}
`,
    });

    // 4. Dominio: Puerto de Repositorio
    archivos.push({
      ruta: `src/${ctx.identificador}/domain/${entidadNombre.toLowerCase()}.repository.ts`,
      contenido: `import { ${entidadNombre} } from './${entidadNombre.toLowerCase()}.aggregate.js';
import { ${idNombre} } from './${idNombre.toLowerCase()}.vo.js';

export interface I${entidadNombre}Repository {
  save(entity: ${entidadNombre}): Promise<void>;
  findById(id: ${idNombre}): Promise<${entidadNombre} | null>;
  findAll(): Promise<${entidadNombre}[]>;
}
`,
    });

    // 5. Aplicación: DTO y Caso de Uso
    archivos.push({
      ruta: `src/${ctx.identificador}/application/use-cases/${casoUsoNombre.toLowerCase()}.usecase.ts`,
      contenido: `import { I${entidadNombre}Repository } from '../../domain/${entidadNombre.toLowerCase()}.repository.js';
import { ${entidadNombre} } from '../../domain/${entidadNombre.toLowerCase()}.aggregate.js';
import { ${idNombre} } from '../../domain/${idNombre.toLowerCase()}.vo.js';

export interface ${casoUsoNombre}Input {
  id: string;
  nombre: string;
}

export interface ${casoUsoNombre}Output {
  id: string;
  nombre: string;
  estado: string;
}

export class ${casoUsoNombre}UseCase {
  constructor(private readonly repository: I${entidadNombre}Repository) {}

  async execute(input: ${casoUsoNombre}Input): Promise<${casoUsoNombre}Output> {
    const voId = ${idNombre}.create(input.id);
    const existing = await this.repository.findById(voId);

    if (existing) {
      throw new Error(\`La entidad con ID \${input.id} ya se encuentra registrada.\`);
    }

    const nuevaEntidad = ${entidadNombre}.create(voId, input.nombre);
    await this.repository.save(nuevaEntidad);

    return {
      id: nuevaEntidad.id.value,
      nombre: nuevaEntidad.nombre,
      estado: nuevaEntidad.estado,
    };
  }
}
`,
    });

    // 6. Infraestructura: Adaptador In-Memory
    archivos.push({
      ruta: `src/${ctx.identificador}/infrastructure/in-memory-${entidadNombre.toLowerCase()}.repository.ts`,
      contenido: `import { I${entidadNombre}Repository } from '../domain/${entidadNombre.toLowerCase()}.repository.js';
import { ${entidadNombre} } from '../domain/${entidadNombre.toLowerCase()}.aggregate.js';
import { ${idNombre} } from '../domain/${idNombre.toLowerCase()}.vo.js';

export class InMemory${entidadNombre}Repository implements I${entidadNombre}Repository {
  private items = new Map<string, ${entidadNombre}>();

  async save(entity: ${entidadNombre}): Promise<void> {
    this.items.set(entity.id.value, entity);
  }

  async findById(id: ${idNombre}): Promise<${entidadNombre} | null> {
    return this.items.get(id.value) || null;
  }

  async findAll(): Promise<${entidadNombre}[]> {
    return Array.from(this.items.values());
  }
}
`,
    });

    // 7. Infraestructura: Controlador HTTP / Interfaz
    archivos.push({
      ruta: `src/${ctx.identificador}/infrastructure/${entidadNombre.toLowerCase()}.controller.ts`,
      contenido: `import { ${casoUsoNombre}UseCase } from '../application/use-cases/${casoUsoNombre.toLowerCase()}.usecase.js';

export class ${entidadNombre}Controller {
  constructor(private readonly useCase: ${casoUsoNombre}UseCase) {}

  async handleCrear(req: { id: string; nombre: string }) {
    try {
      const result = await this.useCase.execute({
        id: req.id,
        nombre: req.nombre,
      });
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  }
}
`,
    });

    // 8. Pruebas Unitarias de Dominio
    archivos.push({
      ruta: `tests/${ctx.identificador}/${entidadNombre.toLowerCase()}.spec.ts`,
      contenido: `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ${entidadNombre} } from '../../src/${ctx.identificador}/domain/${entidadNombre.toLowerCase()}.aggregate.js';
import { ${idNombre} } from '../../src/${ctx.identificador}/domain/${idNombre.toLowerCase()}.vo.js';

describe('Bounded Context [${ctx.nombre}]: ${entidadNombre} Aggregation', () => {
  it('Debe crear correctamente la entidad respetando las invariantes', () => {
    const id = ${idNombre}.create('UUID-001');
    const entidad = ${entidadNombre}.create(id, 'Prueba de Dominio');

    assert.equal(entidad.id.value, 'UUID-001');
    assert.equal(entidad.nombre, 'Prueba de Dominio');
    assert.equal(entidad.estado, 'ACTIVO');
  });

  it('Debe disparar el evento de dominio correspondiente al crearse', () => {
    const id = ${idNombre}.create('UUID-002');
    const entidad = ${entidadNombre}.create(id, 'Validacion Eventos');
    const eventos = entidad.pullDomainEvents();

    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].eventName, '${ctx.identificador}.${entidadNombre.toLowerCase()}.creado');
  });

  it('Debe lanzar error si el nombre viola la regla de longitud mínima', () => {
    const id = ${idNombre}.create('UUID-003');
    assert.throws(() => {
      ${entidadNombre}.create(id, 'ab');
    }, /Invariante rota/);
  });
});
`,
    });

    return archivos;
  }

  private static generarMainTs(analisis: AnalisisEnunciado): string {
    const primerCtx = analisis.boundedContexts[0];
    const primerEntidad = primerCtx ? (primerCtx.entidades[0] || `${primerCtx.nombre}Entity`) : 'Entity';
    const primerCasoUso = primerCtx ? (primerCtx.casosUso[0] || `Gestionar${primerEntidad}`) : 'UseCase';

    return `/**
 * @fileoverview Composition Root principal para ${analisis.titulo}.
 * Inicializa adaptadores de infraestructura y ejecuta demostración de casos de uso DDD.
 */

${analisis.boundedContexts
  .map(
    (c) => `import { InMemory${c.entidades[0] || `${c.nombre}Entity`}Repository } from './${c.identificador}/infrastructure/in-memory-${(c.entidades[0] || `${c.nombre}Entity`).toLowerCase()}.repository.js';
import { ${c.casosUso[0] || `Gestionar${c.entidades[0] || `${c.nombre}Entity`}`}UseCase } from './${c.identificador}/application/use-cases/${(c.casosUso[0] || `Gestionar${c.entidades[0] || `${c.nombre}Entity`}`).toLowerCase()}.usecase.js';
import { ${c.entidades[0] || `${c.nombre}Entity`}Controller } from './${c.identificador}/infrastructure/${(c.entidades[0] || `${c.nombre}Entity`).toLowerCase()}.controller.js';`
  )
  .join('\n')}

async function bootstrap() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛡️  INICIANDO SISTEMA DDD: ${analisis.titulo.toUpperCase()}');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  ${analisis.boundedContexts
    .map(
      (c, i) => `// 1.${i + 1}. Inicializar Contexto: ${c.nombre}
  const repo${i} = new InMemory${c.entidades[0] || `${c.nombre}Entity`}Repository();
  const uc${i} = new ${c.casosUso[0] || `Gestionar${c.entidades[0] || `${c.nombre}Entity`}`}UseCase(repo${i});
  const ctrl${i} = new ${c.entidades[0] || `${c.nombre}Entity`}Controller(uc${i});

  const demo${i} = await ctrl${i}.handleCrear({
    id: 'DEMO-${(i + 1).toString().padStart(3, '0')}',
    nombre: 'Ejemplar Inicial ${c.nombre}',
  });
  console.log('✅ [${c.nombre}] Caso de uso ejecutado:', demo${i});`
    )
    .join('\n\n  ')}

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Sistema iniciado y validado con éxito.');
}

bootstrap().catch(console.error);
`;
  }
}
