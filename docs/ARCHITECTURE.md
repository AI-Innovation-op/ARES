# Arquitectura de ARES CLI 5

ARES es un asistente de ingeniería que funciona en terminal. La interfaz web y el backend anteriores son aplicaciones separadas; no son dependencias del CLI.

## Modelo y lenguaje

| Concepto | Significado e invariantes |
|---|---|
| Conversación | Agregado que conserva pares de consulta/respuesta completados. Nunca registra como exitoso un stream interrumpido. |
| Turno | Consulta, respuesta, instante y modelo utilizado. El número de turnos coincide con la revisión del agregado. |
| Propuesta | Agregado de hasta 24 cambios revisables, vinculado a una raíz y a hashes del contenido leído. El modelo propone; el comando `apply` autoriza la escritura. |
| Cambio | Ruta portable, hash anterior y contenido final completo; `null` representa eliminación. |
| Diario de recuperación | Copias anteriores guardadas antes de modificar el primer archivo. Permite recuperar una aplicación interrumpida. |
| Verificación | Evidencia inmutable de un script ejecutado: salida, tiempo medido, huella de fuentes y revisión de propuesta. Un éxito histórico no se confunde con el estado actual. |
| Instantánea | Lectura limitada del proyecto; incluye rutas, contenido y hashes. Sus omisiones son explícitas. |
| Ruta de fuente | Value object que rechaza traversal, rutas absolutas, alias reservados de Windows, controles, credenciales y carpetas excluidas. |

## Contextos y dependencias

```text
cli/src/
  conversation/
    domain/          Conversation y Turn
    application/     Ask y puerto ConversationRepository
  changes/
    domain/          Proposal, FileChange y transiciones
    application/     ChangeCode, ProposalRepository y ChangeWorkspace
  workspace/
    domain/          Reexportación de tipos de fuente compartidos
    application/     Inspección estática y WorkspaceReader
  architecture/
    domain/          Capas, infracciones y componentes con ciclos
    application/     AnalyzeArchitecture y puerto SourceAnalyzer
  engineering/
    application/     Documentos y plantilla CLI DDD de referencia
  verification/
    domain/          Verification y sus invariantes de evidencia
    application/     VerifyProject, ProjectChecks y VerificationRepository
  shared/
    domain/          Errores, SourcePath, SourceFile y Snapshot
    application/     LanguageModel, Identity y política de ingeniería
  infrastructure/    HTTP/SSE, SQLite, configuración y archivos
  presentation/      Commander, stdin/stdout, REPL y composición
  index.ts           Entrada de proceso y códigos de salida
```

El dominio no importa infraestructura, Node, presentación ni casos de uso. La aplicación depende de modelos y puertos. Los adaptadores implementan los puertos; `presentation/program.ts` compone las dependencias. La prueba de arquitectura inspecciona imports con el AST de TypeScript.

`engineering` es un módulo de aplicación, no un dominio inventado. La plantilla contiene un dominio real y pequeño de tareas: título válido, finalización única y persistencia. No afirma resolver automáticamente requisitos de otro negocio.

## Persistencia y concurrencia

La base `ARES_HOME/ares.sqlite` es exclusiva del CLI. Usa SQLite nativo, WAL, sincronización FULL, sentencias parametrizadas y versión de esquema. El esquema 2 incorporó verificaciones; el esquema 3 añade búsqueda FTS5. Antes de migrar una base existente de esquema 1/2, `VACUUM INTO` crea una copia consistente independiente con nombre único en el mismo directorio. La migración y la reconstrucción del índice se realizan dentro de una transacción. La copia contiene datos privados y no debe publicarse.

Conversaciones y propuestas se guardan como agregados con revisión. Una actualización condicional evita que dos terminales pierdan turnos o transiciones al guardar simultáneamente. Un conflicto devuelve error. La conversación y su índice de búsqueda se actualizan en la misma transacción: un fallo de revisión no altera el índice. Las búsquedas usan parámetros y palabras literales combinadas con AND, sin interpretar operadores del usuario.

Los IDs se resuelven primero por coincidencia exacta y después por prefijo alfanumérico de al menos 8 caracteres. Dos coincidencias bastan para rechazar un prefijo ambiguo; no se elige el primer registro. Para recuperar una versión de esquema anterior, conserva la base migrada y restaura la copia como `ares.sqlite` en otro `ARES_HOME` vacío con las terminales ARES cerradas.

La aplicación de una propuesta sigue este orden:

1. Adquirir un bloqueo de SQLite sobre una base mutex por raíz canónica, en el directorio temporal privado del usuario. El sistema operativo lo libera al terminar o caer el proceso; no se borran bloqueos obsoletos para recuperarlo.
2. Validar todas las rutas y hashes, antes de escribir.
3. Guardar copias y estado `applying` de forma durable.
4. Reemplazar archivos mediante temporal en el mismo directorio, `fsync` y rename.
5. Marcar `applied`. Ante un fallo, intentar recuperar las copias.

La restauración valida todos los archivos antes de actuar. Si detecta una edición posterior, se detiene sin sobrescribirla. Acepta estados `applying`, `applied` y `restoring` para recuperarse después de una caída. Las propuestas restauradas no se reaplican: se crea una nueva.

Esta operación no es una transacción global del sistema de archivos: cada archivo se reemplaza individualmente. Un proceso externo puede modificar archivos mientras ARES trabaja. El bloqueo coordina procesos ARES del mismo usuario aunque usen distintos `ARES_HOME`; no bloquea editores externos. Restaurar recupera el contenido de los archivos y puede dejar directorios vacíos creados durante la aplicación.

## Proveedores y contexto

Un adaptador implementa el protocolo HTTP de chat compatible de Gemini, OpenRouter y servidores locales. El ID del modelo es configuración del usuario, no un catálogo de nombres fijados que puede caducar. Los endpoints personalizados requieren el proveedor `compatible` y su propia credencial; las claves de Gemini/OpenRouter no se redirigen a otro host. No hay sustitución silenciosa por un simulador ni failover que cambie de proveedor sin mostrarlo.

El parser SSE maneja fragmentos UTF-8, CRLF, comentarios y eventos multilínea. Reconoce errores HTTP y errores dentro del stream, respuestas vacías, límites de tokens y cierres incompletos. Ctrl+C y el timeout cancelan la petición. Los cuerpos de error del proveedor no se imprimen.

El lector respeta `.gitignore` y `.aresignore`, incluidas reglas superiores dentro de un repositorio Git. Excluye ubicaciones privadas, binarios, enlaces simbólicos/junctions y archivos con hard links. Límites por lectura: 240 archivos, 128 KB por archivo, 800 KB totales, profundidad 30 y 10 000 directorios. El contexto enviado tiene un presupuesto adicional de 100 000 caracteres y explica sus omisiones. El historial adjunto conserva pares completos dentro de un presupuesto de 80 000 caracteres.

Se redactan patrones habituales de secretos; no es un detector universal. `context --content` permite revisar la selección antes de una consulta. Una consulta con `--context`, `audit --ai`, `doc`, `test` o `propose` sin `--from` transmite las fuentes seleccionadas al proveedor configurado. Los comandos locales no realizan esas solicitudes.

SQLite, las conversaciones y las copias se almacenan localmente, sin cifrado propio. Se solicitan permisos de usuario en sistemas Unix; en Windows se heredan las ACL del directorio. El usuario decide qué conserva y dónde ubica `ARES_HOME`.

## Evidencia y límites

`analyze` obtiene hechos del AST de TypeScript mediante un adaptador que solo ve la instantánea seleccionada. El dominio calcula infracciones entre capas y componentes fuertemente conectados, incluyendo imports de tipos. Cada ciclo representa un grupo conectado; el orden de la lista no afirma ser la secuencia de sus aristas. Los nombres de carpeta determinan las capas: no se deduce el lenguaje del negocio de nombres arbitrarios.

Se resuelven imports relativos y alias definidos en opciones locales de `tsconfig.json`. Los imports dinámicos calculados y configuraciones heredadas no se evalúan. Vue se inspecciona por bloques script, sin ejecutar su compilador. Los imports sin resolver y lenguajes no soportados se muestran aparte. `--fail-on any` rechaza además una instantánea truncada o sin módulos compatibles. Sentinel ejecuta este análisis con permisos de lectura y deja el informe en Actions; no necesita claves ni publica comentarios automáticos.

`setup` usa una única interfaz readline con salida silenciada durante la clave y sin historial. Si no puede asegurar el modo oculto, rechaza la entrada. `config set --key-stdin` permite automatización sin clave en argumentos. Las actualizaciones del archivo personal conservan contenido ajeno, validan el resultado y usan temporal más reemplazo bajo bloqueo local. No sustituyen variables de proceso o de proyecto de mayor precedencia.

Cada proveedor tiene una variable de clave propia; el alias genérico `ARES_API_KEY_DIRECT` requiere migración. Un decorador del puerto de IA elimina la clave configurada de mensajes salientes y del stream recibido, incluso si aparece repartida entre chunks. Se redacta antes de mostrar, persistir o indexar una respuesta nueva. No reescribe historiales antiguos ni detecta universalmente secretos desconocidos.

`verify` ejecuta solo el script de `package.json` que el usuario pide, mediante `node --run`. El nombre se valida y no se construye un comando con argumentos del modelo. El script del proyecto sí es código ejecutable y requiere confianza. Su resultado guarda el código del proceso ejecutor (Node puede normalizar un fallo del script a código 1), salida limitada y redactada, duración medida y huella del contexto de fuentes. La comparación de huellas conserva sus límites de lectura; no es trazado de todas las dependencias o lecturas del proceso. Para la huella de una verificación se respetan las exclusiones del proyecto, sin permitir que un `.gitignore` de una carpeta superior oculte todo el proyecto explícito. Timeout y cancelación detienen el árbol iniciado. La evidencia histórica no se modifica: `verifications show` expone por separado si coincide con el estado actual.

`audit` produce señales heurísticas con ruta y línea; no mide Big-O, SOLID, cobertura ni vulnerabilidades de dependencias. `test` propone tests; no los ejecuta. `forge` crea una plantilla concreta y comprobable. La CLI no ejecuta shell generado, no instala dependencias del proyecto objetivo y no crea commits o pushes en nombre del usuario.

Las pruebas HTTP usan un servidor local controlado. Verifican el transporte real y la integración CLI/SQLite/archivos; no acreditan calidad del razonamiento ni acceso a proveedores comerciales. La prueba viva del proveedor se realiza con `ares doctor --probe`.

## Referencias del protocolo

- [Gemini: compatibilidad de chat y streaming](https://ai.google.dev/gemini-api/docs/openai/).
- [OpenRouter: solicitud de chat](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion).
- [OpenRouter: streaming y errores](https://openrouter.ai/docs/api_reference/streaming).
- [SQLite nativo en Node.js 24](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html).

Las decisiones de implementación están en [ADR 0001](adr/0001-cli-first.md), [ADR 0002](adr/0002-reviewable-changes.md), [ADR 0003](adr/0003-verification-evidence.md) y [ADR 0004](adr/0004-architecture-and-local-search.md).
