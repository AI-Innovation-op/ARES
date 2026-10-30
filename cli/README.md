# ARES CLI 5

Asistente de ingeniería para CMD, PowerShell y terminales Unix. Node.js 24 o superior. Funciona sin servidor web.

Desde una instalación global: `ares --help`. Desde el repositorio: `npm run setup` en la raíz y `ares.cmd doctor` (PowerShell: `.\ares.cmd doctor`).

```cmd
ares doctor
ares audit .
ares forge mi-proyecto
ares config init --provider openrouter
```

Edita el `.env` local indicado por `config init`; asigna `ARES_MODEL` y `OPENROUTER_API_KEY`. Para Gemini: `ARES_PROVIDER=gemini` y `GEMINI_API_KEY`. Para un servidor local ya instalado: `ARES_PROVIDER=compatible`, `ARES_BASE_URL=http://127.0.0.1:11434/v1` y el ID del modelo en `ARES_MODEL`. Las claves se guardan localmente y no se pasan como argumentos.

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
ares restore ID
```

Las propuestas no modifican el proyecto hasta ejecutar `apply`. Se comprueban hashes y rutas, y se guardan copias antes de escribir. `restore` se detiene si detecta ediciones posteriores. `propose --from cambios.json --path mi-proyecto` permite importar `{ "summary": "...", "changes": [{ "path": "src/a.ts", "content": "archivo completo" }] }` sin IA; `content: null` solicita eliminación.

Más comandos: `context`, `doc`, `test`, `sessions`, `proposals` y `zip`. `--json` permite automatización; `audit --fail-on high` devuelve código 1 si encuentra señales de nivel alto. Consulta el detalle de cada comando con `--help`.

`forge` genera una plantilla concreta de tareas con DDD, SQLite y tests, ejecutable sin instalar paquetes. No interpreta requisitos arbitrarios. `audit` es heurístico; `test` propone pruebas, sin ejecutarlas. `zip` exporta solo fuentes filtradas y redactadas; no es una copia exacta. Las funciones de IA envían el contexto seleccionado al proveedor configurado. Conversaciones y copias son locales y no tienen cifrado propio.

Desarrollo desde `cli/`: `npm ci --ignore-scripts` y `npm run check`. El protocolo HTTP se prueba con un servidor local; el acceso comercial se comprueba por separado con `doctor --probe`.

Kevin / AI Innovation. MIT.
