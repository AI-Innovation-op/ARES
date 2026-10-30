# ARES CLI 5.2

Asistente de ingeniería para CMD, PowerShell y terminales Unix. Node.js 24 o superior. Funciona sin servidor web.

Desde una instalación global: `ares --help`. Desde el repositorio: `npm run setup` en la raíz y `ares.cmd doctor` (PowerShell: `.\ares.cmd doctor`).

```cmd
ares doctor
ares audit .
ares analyze . --json
ares forge mi-proyecto
ares setup
```

El asistente solicita proveedor, modelo y clave con entrada oculta. Usa un terminal de confianza. También puedes crear una plantilla con `config init` y editarla localmente. `config set` actualiza proveedor, modelo y URL; `--key-stdin` recibe una clave mediante una tubería segura, nunca como argumento. Las claves usan `OPENROUTER_API_KEY`, `GEMINI_API_KEY` o `COMPATIBLE_API_KEY` según el proveedor; el alias genérico `ARES_API_KEY_DIRECT` debe migrarse. Para un servidor local ya instalado: `ARES_PROVIDER=compatible`, `ARES_BASE_URL=http://127.0.0.1:11434/v1` y su modelo en `ARES_MODEL`. Variables del proceso o del proyecto tienen precedencia sobre el archivo personal.

```cmd
ares doctor --probe
ares ask "Explica las invariantes de un agregado" --context .
ares
```

La sesión interactiva tiene `/help`, `/new`, `/history`, `/sessions`, `/resume ID`, `/context RUTA` y `/exit`. El historial se guarda en `%USERPROFILE%\.ares\ares.sqlite` o en `ARES_HOME`. Una respuesta cancelada o incompleta no se registra como turno completado.

```cmd
ares propose "Corrige esta invariante" --path mi-proyecto
ares diff ID
ares apply ID
ares verify ID --script test
ares restore ID
```

Las propuestas no modifican el proyecto hasta ejecutar `apply`. Se comprueban hashes y rutas, y se guardan copias antes de escribir. `restore` se detiene si detecta ediciones posteriores. `propose --from cambios.json --path mi-proyecto` permite importar `{ "summary": "...", "changes": [{ "path": "src/a.ts", "content": "archivo completo" }] }` sin IA; `content: null` solicita eliminación.

`verify` ejecuta un script explícito del proyecto mediante `node --run` y registra su salida real. Requiere confiar en ese script. Un timeout o Ctrl+C detiene los procesos iniciados. Las fuentes o propuestas modificadas durante la ejecución invalidan el resultado. `verifications list` y `show ID` consultan evidencia histórica; `show` compara la huella con el estado actual.

`sessions search "palabras" --limit 10` busca en títulos, consultas y respuestas mediante SQLite FTS5, sin distinguir mayúsculas o tildes. Las palabras se combinan con AND. Sesiones, propuestas y verificaciones aceptan IDs completos o prefijos únicos de al menos 8 caracteres. Un prefijo ambiguo devuelve conflicto.

La base CLI se migra al esquema 3 conservando datos. Antes de migrar esquemas 1/2 se crea una copia consistente `ares-schema-N-backup-UUID.sqlite` en `ARES_HOME`. También contiene información privada. Versiones anteriores de la CLI no deben abrir el nuevo esquema; para volver atrás conserva el original migrado y recupera la copia como `ares.sqlite` en otro `ARES_HOME` vacío con todas las terminales ARES cerradas.

`analyze RUTA --fail-on any` construye un grafo de imports con el AST de TypeScript: capas inferidas por directorio, infracciones, ciclos y referencias sin resolver. Admite JS, TS y bloques script de Vue; no compila ni ejecuta el proyecto. Usa solo fuentes y opciones locales de `tsconfig` presentes en la instantánea. No carga `extends` externos. `any` falla también ante imports sin resolver, parseos inválidos, una instantánea truncada o ningún módulo compatible. Los lenguajes no soportados se informan sin certificarlos.

Más comandos: `context`, `doc`, `test`, `sessions`, `proposals`, `models` y `zip`. `models` consulta el catálogo actual sin exigir un modelo ya seleccionado. `--json` permite automatización; `audit --fail-on high` devuelve código 1 si encuentra señales de nivel alto. Consulta el detalle de cada comando con `--help`.

Dentro de la sesión también puedes usar `/audit`, `/analyze`, `/search PALABRAS`, `/forge`, `/propose`, `/diff`, `/apply`, `/verify`, `/restore`, `/models` y `/model ID`; las rutas con espacios se escriben entre comillas.

`forge` genera una plantilla concreta de tareas con DDD, SQLite y tests, ejecutable sin instalar paquetes. No interpreta requisitos arbitrarios. `audit` es heurístico; `test` propone pruebas, sin ejecutarlas. `zip` exporta solo fuentes filtradas y redactadas; no es una copia exacta. Las funciones de IA envían el contexto seleccionado al proveedor configurado. Conversaciones y copias son locales y no tienen cifrado propio.

Desarrollo desde `cli/`: `npm ci --ignore-scripts` y `npm run check` (formato, tipos, pruebas y límites de arquitectura). `npm run portable` empaqueta las dependencias fijadas sin scripts de instalación; `npm run smoke:portable` prueba el ZIP extraído, su analizador, configuración y un proyecto generado con tests. El protocolo HTTP se prueba con un servidor local; el acceso comercial de inferencia se comprueba por separado con `doctor --probe`.

Kevin / AI Innovation. MIT.
