# ARES — ingeniería desde terminal

CLI independiente para conversar sobre código, inspeccionar proyectos, generar documentación y aplicar cambios revisables. Funciona desde **CMD, PowerShell y terminales Unix**, sin levantar un backend o abrir un navegador.

La versión 5 reconstruye el núcleo de terminal con dominio puro, casos de uso, puertos y adaptadores. Las conversaciones y las propuestas tienen invariantes y persistencia SQLite. El diseño usa DDD en las reglas que lo necesitan y conserva una aplicación local pequeña.

**Versión CLI: 5.1.0. Requisito: Node.js 24 o superior.** Git es necesario para clonar el repositorio; la ejecución del CLI no lo requiere.

## Empezar en CMD

Después de clonar o descargar esta versión:

```cmd
cd ARES
npm run setup
ares.cmd doctor
ares.cmd --help
```

Desde PowerShell usa ` .\ares.cmd doctor`. En Unix: `node cli/dist/index.js doctor`.

Para registrar `ares` globalmente en Windows:

```cmd
install.bat
ares doctor
```

`install.bat --local --no-pause` instala y compila sin registrar un comando global. El instalador comprueba errores y no cambia la política de ejecución de PowerShell. También puedes instalar manualmente: `cd cli`, `npm ci --ignore-scripts`, `npm run build`, `npm link --ignore-scripts`.

Los ejemplos siguientes usan `ares`; si trabajas sin instalación global, sustituye ese nombre por `ares.cmd` desde la raíz del repositorio.

## Útil sin claves ni conexión

```cmd
ares doctor
ares audit .
ares context .
ares forge "D:\proyectos\mi-primera-cli" --name "Mi proyecto"
```

`forge` crea una aplicación DDD de **seguimiento de tareas**. Es una plantilla concreta para adaptar a tu negocio, con dominio, casos de uso, SQLite, CLI y tests. Se ejecuta sin instalar paquetes:

```cmd
cd /d "D:\proyectos\mi-primera-cli"
node src/main.ts add "Preparar primera entrega"
node src/main.ts list
node src/main.ts complete ID_DE_LA_TAREA
node --test test/*.test.ts
```

Para comprobar tipos en el proyecto generado: `npm install` y `npm run typecheck`.

## Configurar la IA

```cmd
ares config init --provider openrouter
ares config show
```

Edita el archivo que indica `config init`, normalmente `%USERPROFILE%\.ares\.env`, con un editor local:

```dotenv
ARES_PROVIDER=openrouter
ARES_MODEL=ID_DEL_MODELO_DISPONIBLE_EN_TU_CUENTA
OPENROUTER_API_KEY=TU_CLAVE_LOCAL
```

No pegues claves en el chat ni las agregues al repositorio. Para Gemini usa `ARES_PROVIDER=gemini` y `GEMINI_API_KEY`. Para un servidor compatible local ya iniciado:

```dotenv
ARES_PROVIDER=compatible
ARES_BASE_URL=http://127.0.0.1:11434/v1
ARES_MODEL=ID_DEL_MODELO_LOCAL_INSTALADO
```

El modelo se elige explícitamente: ARES no fija nombres de modelos que pueden retirarse ni instala modelos locales por su cuenta. Puedes sobrescribir la selección con `--provider` y `--model`. `COMPATIBLE_API_KEY` sirve para servidores compatibles que requieren autenticación.

La configuración se resuelve en este orden: flags, variables del proceso, `.env` del directorio actual y `.env` personal. `ARES_HOME` cambia la ubicación de los datos; `ARES_ENV_FILE` selecciona otro archivo de configuración. La plantilla específica del CLI está en [cli/.env.example](cli/.env.example). El `.env.example` de la raíz corresponde al backend histórico.

```cmd
ares doctor --probe
ares ask "Ayúdame a definir las invariantes de mi agregado"
ares ask "Revisa los límites de estos contextos" --context .
ares
```

`doctor` comprueba la configuración local. Solo `doctor --probe` verifica la conexión mediante una consulta real, que puede consumir cuota del proveedor.

Consulta los identificadores actuales con `ares models --filter TEXTO`. El catálogo no garantiza acceso ni cuota; `doctor --probe` realiza la comprobación de inferencia.

La sesión interactiva admite `/help`, `/new`, `/history`, `/sessions`, `/resume ID`, `/context RUTA`, `/doctor`, `/models`, `/model ID` y `/exit`. También permite `/audit`, `/forge`, `/doc`, `/test`, `/propose`, `/diff`, `/apply`, `/verify` y `/restore` con las mismas opciones que la CLI. Las rutas con espacios van entre comillas. Tab completa los comandos. Ctrl+C cancela una operación en curso; los turnos incompletos no se guardan como exitosos.

## Proponer, revisar, aplicar y restaurar

```cmd
ares propose "Impide completar una tarea dos veces" --path "D:\mi-proyecto"
ares diff ID_DE_PROPUESTA
ares apply ID_DE_PROPUESTA
ares verify ID_DE_PROPUESTA --script test
ares restore ID_DE_PROPUESTA
```

`propose` guarda una propuesta sin escribir en el proyecto. `diff` muestra cambios unificados. `apply` comprueba todas las rutas y hashes, conserva copias y aplica el conjunto. `restore` recupera el contenido original. Si un archivo tiene una edición posterior, la operación se detiene para conservarla.

`verify` ejecuta un script elegido del `package.json` del proyecto mediante `node --run`; requiere confiar en ese script. Guarda salida real, duración, código del ejecutor, huella de fuentes y revisión de propuesta. No ejecuta hooks `pre`/`post` por su cuenta. Un timeout o Ctrl+C detiene el árbol de procesos iniciado. Si las fuentes cambian durante la ejecución, el resultado se marca `stale`, aunque el script termine con cero. `verifications show ID` compara también la evidencia histórica con el estado actual, sin reescribir lo ocurrido.

También puedes verificar un proyecto sin propuesta: `ares verify --path RUTA --script test --timeout 120000`. La salida guardada se limita a los últimos 32000 caracteres de cada canal y redacta patrones comunes de credenciales.

El mismo flujo funciona sin IA importando un JSON local:

```json
{
  "summary": "Añadir una nota de arquitectura",
  "changes": [
    { "path": "docs/nota.md", "content": "# Decisión\n\nEl dominio no depende de SQLite.\n" }
  ]
}
```

```cmd
ares propose --from cambios.json --path "D:\mi-proyecto"
```

`content` contiene el archivo completo; `null` solicita su eliminación. Revisa siempre que el diff corresponda al requerimiento. Los tests verdes no justifican cambios ajenos al alcance.

## Comandos

| Comando | Resultado |
|---|---|
| `ares` / `ares repl` | Conversación interactiva con historial local. |
| `ares ask "consulta" --context RUTA` | Respuesta con streaming real; `--session ID` continúa una conversación. |
| `ares doctor [--probe]` | Diagnóstico; la consulta de IA es explícita. |
| `ares models [--filter TEXTO]` | Catálogo actual del proveedor, sin fijar IDs en el código. |
| `ares config init` / `show` | Configuración local sin mostrar claves. |
| `ares context RUTA [--content]` | Archivos seleccionados; contenido redactado opcional. No llama a IA. |
| `ares audit RUTA [--ai]` | Señales estáticas con ruta y línea; revisión de IA opcional. |
| `ares doc adr "instrucción" --context RUTA -o salida.md` | Documento de IA: `readme`, `adr`, `rfc`, `openapi` o `c4`. |
| `ares test archivo.ts -f node:test -o propuesta.test.ts` | Tests propuestos por IA; no se ejecutan automáticamente. |
| `ares forge NUEVA_CARPETA` | Plantilla CLI DDD de tareas, sin IA. |
| `ares zip CARPETA salida.zip` | ZIP de fuentes filtradas y redactadas; no es copia exacta ni incluye binarios. |
| `ares sessions list` / `show ID` / `export ID -o historial.md` | Consulta y exportación de sesiones. |
| `ares propose`, `diff ID`, `apply ID`, `restore ID` | Flujo de cambios revisables con recuperación. |
| `ares proposals` | Últimas 50 propuestas y sus estados. |
| `ares verify [ID] --path RUTA --script test` | Ejecuta un script explícito y guarda evidencia asociada a fuentes y propuesta. |
| `ares verifications list` / `show ID` | Consulta resultados reales y su correspondencia con el estado actual. |

`--json` produce salida estructurada sin banners y errores JSON en stderr. Los archivos de salida existentes no se sobrescriben. Se puede enviar texto por stdin:

```cmd
type pregunta.txt | ares ask --json
ares audit . --fail-on high --json
```

Códigos de salida: `0` completado; `1` fallo operativo, conflicto o hallazgos solicitados con `--fail-on`; `2` configuración o argumentos inválidos; `130` cancelación. La interfaz interactiva informa errores y permite seguir conversando.

## Límites claros

- El contexto respeta `.gitignore` y `.aresignore`, excluye ubicaciones privadas, binarios y enlaces, y tiene límites de tamaño. `context --content` muestra la selección redactada antes de enviarla.
- Las funciones de IA transmiten el contexto seleccionado al proveedor configurado. La redacción de secretos es heurística, no una garantía universal.
- El historial y las copias se guardan en `ARES_HOME/ares.sqlite`, sin cifrado propio. No se reutiliza ni migra la base del backend anterior.
- `audit` no certifica seguridad, no calcula una puntuación SOLID y no inventa métricas. `test` no presenta tests generados como ejecutados.
- La aplicación de cambios es recuperable, con reemplazo individual de archivos. No proporciona una transacción global frente a editores u otros procesos externos.

## Desarrollo y verificación

```cmd
npm run setup
npm run check
```

Las pruebas cubren invariantes, dirección de dependencias, persistencia real, concurrencia, HTTP/SSE fragmentado, errores, timeouts, exclusión de secretos y el ciclo de propuesta/aplicación/restauración. También ejecutan la CLI generada y sus tests. El servidor HTTP de las pruebas es controlado; el acceso a proveedores comerciales se verifica aparte con `doctor --probe`.

Para crear la distribución portable con dependencias de ejecución fijadas: `npm run portable`. Para extraerla y comprobar el arranque, el wrapper del sistema y los tests del proyecto generado: `npm run smoke:portable`. El ZIP requiere Node.js 24 o superior y no requiere `npm install` en el equipo de destino.

La CI incluye Windows y Ubuntu con Node 24 y 26; Node 24 también construye y ejecuta el portable. Consulta el resultado de cada ejecución en GitHub Actions. La configuración de una matriz no equivale a sus resultados. Detalles: [arquitectura y límites](docs/ARCHITECTURE.md), [decisiones](docs/adr/0001-cli-first.md) y [validación 5.1](docs/VALIDATION-5.1.md).

## Componentes históricos

`backend/`, `frontend/`, `mcp/` y `hooks/` se conservan por separado. La CLI 5 no necesita esos servicios ni usa `ARES_API_URL`. Comandos antiguos como `bio`, `route`, `benchmark`, `swarm` y `setup-git` no forman parte de esta nueva CLI. `chat` continúa como alias de `ask`; `forge` ahora crea la plantilla local descrita arriba.

La [documentación de la web v4](docs/legacy-web-v4.md) es un archivo histórico; sus capacidades y resultados no se presentan como verificación de la nueva CLI.

Creado por Kevin / AI Innovation. Licencia [MIT](LICENSE).
