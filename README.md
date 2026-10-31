# 🛡️ A.R.E.S. Ecosystem (v5.7 Terminal CLI // Created by AI Innovation)

> **"Un código sin documentación es una fortaleza sin murallas. Una arquitectura sin auditoría es una espada sin filo. Y un proyecto sin tu autoría es una batalla ganada sin honor."**
>
> *Soy A.R.E.S. (Autonomous Resilient Engineering & Software-Documentation God), tu copiloto táctico de ingeniería y documentación. Mi centro de operaciones es tu terminal.*
>
> 🏷️ **Versión actual: [v5.7.0 — Release oficial](https://github.com/AI-Innovation-op/ARES/releases/tag/v5.7.0)** · Terminal independiente · Proyectos DDD · Cambios revisables · Historial local.

[![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933?style=flat&logo=nodedotjs)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Terminal CLI](https://img.shields.io/badge/CLI-CMD_%7C_PowerShell_%7C_Unix-111827?style=flat)](#empezar-en-cmd)
[![SQLite](https://img.shields.io/badge/SQLite-Historial_local-003B57?style=flat&logo=sqlite)](#arquitectura-e-historial-sin-ia)
[![Proveedores de IA](https://img.shields.io/badge/IA-Ollama_local_%2B_5_proveedores_%2B_compatibles-6366F1?style=flat)](#configurar-la-ia)
[![CI](https://github.com/AI-Innovation-op/ARES/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AI-Innovation-op/ARES/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

### ⚡ Acceso rápido & descarga oficial de la terminal

<div align="center">

[![Descargar ARES v5.7.0 ZIP portable](https://img.shields.io/badge/Descargar-ARES_v5.7.0_ZIP_portable-007ACC?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AI-Innovation-op/ARES/releases/download/v5.7.0/ARES-5.7.0-portable.zip)
[![Ver release v5.7.0 en GitHub](https://img.shields.io/badge/GitHub-Release_v5.7.0-2EA44F?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AI-Innovation-op/ARES/releases/tag/v5.7.0)
[![Descargar código fuente ZIP](https://img.shields.io/badge/Descargar-Codigo_fuente_ZIP-9333EA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AI-Innovation-op/ARES/releases/download/v5.7.0/ARES-5.7.0-source.zip)

</div>

> 🚀 **¿Quieres empezar directamente en tu PC?**
>
> 1. Instala [Node.js 24 o superior](https://nodejs.org/).
> 2. **[⬇️ Descarga el ZIP portable de ARES](https://github.com/AI-Innovation-op/ARES/releases/download/v5.7.0/ARES-5.7.0-portable.zip)** y extrae el archivo completo en tu disco, por ejemplo en `C:\ARES` o `D:\ARES`.
> 3. Si quieres usar IA, abre CMD en la carpeta que contiene `ares.cmd` y ejecuta **`ares.cmd setup`** para configurar proveedor, modelo y clave. Las funciones locales funcionan sin claves.
> 4. Haz doble clic en **`INICIAR_ARES.bat`** para abrir la terminal y escribe **`help`** para ver los comandos. El portable incluye las dependencias; no necesita `npm install`.
>
> 📖 **¿Prefieres instalar desde el código fuente y tener el comando global `ares`?** Descarga el ZIP de fuentes y sigue [Empezar en CMD](#empezar-en-cmd).
>
> 🔎 [Ver hashes SHA-256 de la descarga](https://github.com/AI-Innovation-op/ARES/releases/download/v5.7.0/SHA256SUMS-5.7.0.txt).

---

## 🏛️ 1. ¿Quién soy? Manifiesto de identidad

Soy **A.R.E.S.**, un proyecto creado por **Kevin / AI Innovation**, con la disciplina de un guardián de código y una misión concreta: acompañarte a entender, documentar y mejorar tus proyectos desde la terminal.

Conservo mi identidad táctica: el logo original, los colores cian y blanco y el prompt `ares@standalone:~$`. En esta versión, mi núcleo es una CLI independiente con reglas de dominio, casos de uso, puertos y adaptadores. Puedo inspeccionar tus fuentes, conversar con el proveedor que elijas y preparar cambios para que revises el diff antes de aplicarlos.

La web y el personaje 3D forman parte de la historia del ecosistema y se conservan por separado. Puedes consultar su [presentación original](docs/legacy-web-v4.md); para usar la CLI actual basta con tu terminal y Node.js.

## ⚔️ 2. ¿Qué puedo hacer por ti?

| Área | Qué ofrece la CLI actual |
| --- | --- |
| **💬 Conversación sobre tu código** | Respuestas con streaming y contexto del proyecto mediante Ollama local, OpenRouter, Gemini, Mistral, Groq, Cohere o un servidor compatible. Tú eliges proveedor y modelo. |
| **🔎 Inspección y arquitectura** | Selección de fuentes, señales de auditoría y análisis AST de imports, capas y ciclos, sin llamar a IA. |
| **🛡️ Escudo de documentación** | Propuestas de README, ADR, RFC, OpenAPI y C4 con IA a partir del contexto seleccionado. |
| **⚒️ Forja DDD** | Plantilla local de seguimiento de tareas con dominio, casos de uso, SQLite, CLI y tests, sin necesitar IA. |
| **⚔️ Cambios revisables** | Proponer, revisar diferencias, aplicar, ejecutar el script de verificación elegido y restaurar el contenido original. |
| **📂 Proyectos y memoria local** | Abrir carpetas, vincular conversaciones a su proyecto y buscar o exportar el historial guardado en SQLite. |
| **📦 Exportación** | Crear ZIP de fuentes filtradas y redactadas para compartir el trabajo. |

Los requisitos, comandos, límites y comprobaciones de estas funciones se explican en la guía completa que sigue.

---

## 📚 ARES — ingeniería desde terminal

CLI independiente para conversar sobre código, inspeccionar proyectos, generar documentación y aplicar cambios revisables. Funciona desde **CMD, PowerShell y terminales Unix**, sin levantar un backend o abrir un navegador.

La versión 5 reconstruye el núcleo de terminal con dominio puro, casos de uso, puertos y adaptadores. Las conversaciones y las propuestas tienen invariantes y persistencia SQLite. El diseño usa DDD en las reglas que lo necesitan y conserva una aplicación local pequeña.

**Versión CLI: 5.7.0. Requisito: Node.js 24 o superior.** Git es necesario para clonar el repositorio; la ejecución del CLI no lo requiere.

También puedes descargar el ZIP portable desde [Releases](https://github.com/AI-Innovation-op/ARES/releases), extraerlo y ejecutar `ares.cmd doctor`. Incluye las dependencias de ejecución; no requiere `npm install`.

La sesión conserva el logo original de ARES, los colores cian/blanco, la firma de AI Innovation y el prompt `ares@standalone:~$`. El banner muestra la versión real y distingue el funcionamiento local de una conexión de IA todavía sin verificar. `help`, `status` y `clear`/`cls` recuperan los accesos del terminal anterior; limpiar la pantalla conserva la sesión y el modelo elegido. El formato se adapta a ventanas estrechas y respeta `NO_COLOR`; las salidas JSON y por tubería permanecen sin escapes de estilo.

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

`install.bat --local --no-pause` instala y compila sin registrar un comando global. El instalador comprueba errores y no cambia la política de ejecución de PowerShell. La instalación global copia un paquete compilado con dependencias fijadas mediante `npm-shrinkwrap.json`: puede seguir ejecutándose al mover o retirar el checkout. Instalación manual desde `cli/`: `npm ci --ignore-scripts` y `npm run install:global`.

Los ejemplos siguientes usan `ares`; si trabajas sin instalación global, sustituye ese nombre por `ares.cmd` desde la raíz del repositorio.

## Abrir un proyecto

```cmd
ares.cmd --project "D:\proyectos\mi-app"
```

La carpeta seleccionada determina las rutas relativas y el contexto de las consultas. Puedes inspeccionar la selección con `ares.cmd --project RUTA context --content` antes de llamar a IA. Las opciones explícitas de ruta o contexto permiten elegir otro objetivo para ese comando.

Dentro del REPL:

```text
/open "D:\proyectos\mi-app"
/analyze
/propose "Describe el cambio requerido"
/close
```

Abrir otro proyecto inicia una conversación nueva. Las sesiones nuevas guardan su proyecto y rechazan continuaciones desde otra carpeta antes de llamar al modelo; reabre la carpeta correcta para usar `/resume ID`. Con un proyecto activo, `apply`, `restore` y `verify ID` también rechazan propuestas de otra raíz. Los IDs conservan su raíz original; `--project` no los reasigna. Las sesiones anteriores sin proyecto siguen disponibles. El vínculo inicial usa la ruta canónica. Al registrar la carpeta con `projects add`, sus conversaciones reciben una identidad estable que sobrevive a la reubicación explícita.

`/context` sin ruta retira el contexto automático de esa conversación. `/close` vuelve a la carpeta desde la que se inició ARES. El directorio del terminal padre permanece igual. La configuración `.env` del proyecto mantiene la precedencia documentada.

## Perfiles y alias de proyecto

```cmd
ares.cmd projects add miapp "D:\proyectos\miapp"
ares.cmd projects list
ares.cmd --project "@miapp"
```

En el REPL puedes usar `/projects` y `/open @miapp`. Los alias usan minúsculas, números, guion o guion bajo y empiezan por una letra. Registrar una carpeta vincula sus conversaciones anteriores sin cambiar sus turnos; las sesiones nuevas utilizan el mismo ID estable.

Para guardar proveedor y modelo preferidos:

```cmd
ares.cmd projects configure miapp --provider gemini --model "ID_DISPONIBLE_EN_TU_CUENTA"
ares.cmd projects show miapp
ares.cmd projects configure miapp --reset
```

Las preferencias guardan solo proveedor y modelo. Las claves permanecen en la configuración privada. Los flags y las selecciones interactivas tienen prioridad, seguidos del entorno, el `.env` del proyecto, sus preferencias registradas y el archivo personal.

Después de mover la carpeta por tu cuenta, ejecuta desde un CMD situado fuera de la ubicación anterior:

```cmd
ares.cmd projects relocate miapp "D:\nueva ruta\miapp"
ares.cmd --project "@miapp"
```

El registro no mueve ni copia archivos. La carpeta de destino debe existir; ARES rechaza la reubicación mientras la original siga presente con su identidad. Cuando el sistema de archivos la proporciona, su identidad también permite detectar una carpeta sustituida en la misma ruta.

Puedes reanudar las conversaciones con `/resume ID` después de abrir el alias. Las propuestas y verificaciones anteriores mantienen su raíz original: mover un proyecto no autoriza a aplicar o restaurar sus cambios en otro destino. Para cargar esta versión, sal de las sesiones anteriores y vuelve a abrir ARES; la primera apertura crea una copia consistente antes de actualizar la base al esquema 4.

## 👥 Trabajo en equipo

ARES está preparado para **Kevin y su equipo de cinco desarrolladores**. Cada persona usa su propio clon, claves, alias e historial; los acuerdos y revisiones se comparten mediante Git.

```cmd
ares.cmd team show
ares.cmd team check
```

El archivo `ares.team.json` guarda los scripts acordados. La CI de este repositorio ejecuta el mismo `team check`. Para incorporarlo a otro proyecto, usa `team init --name "Mi equipo"`; detecta sus scripts existentes sin ejecutarlos. Si faltan, se configura una lista vacía para completarla después.

La recomendación opcional de IA se guarda con `team init --ai-provider PROVEEDOR --ai-model MODELO`, sin claves. Cada integrante puede elegir sus preferencias con `projects configure`. La precedencia es: flags/interacción, entorno, `.env` del proyecto, perfil personal del proyecto, recomendación del equipo y configuración personal general.

### Intercambiar cambios para revisión

```cmd
ares.cmd handoff export ID_LOCAL -o "D:\revisiones\cambio.ares-change.json"
ares.cmd handoff inspect "D:\revisiones\cambio.ares-change.json"
ares.cmd --project "D:\mi-clon" handoff import "D:\revisiones\cambio.ares-change.json"
```

La importación crea un **ID local nuevo** y conserva los archivos. Después se revisa con `diff NUEVO_ID`, se aplica con `apply NUEVO_ID` y se comprueba con `verify NUEVO_ID`. Si los archivos de partida difieren, se detiene antes de crear la propuesta. La huella verifica integridad; la procedencia y autoría se revisan en la PR.

El paquete comparte el resumen y el contenido de los cambios, con rutas relativas. Las copias, claves, historial y evidencia de ejecución permanecen locales. La detección de secretos es heurística; revisa el contenido antes de compartirlo. Guía completa: [contribuir en equipo](CONTRIBUTING.md).

## Útil sin claves ni conexión

```cmd
ares doctor
ares audit .
ares analyze . --json
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
ares setup
ares config show
```

El asistente solicita proveedor, modelo y clave mediante entrada oculta, sin guardarla en el historial del terminal. Comprueba que usas un terminal de confianza. La configuración queda normalmente en `%USERPROFILE%\.ares\.env`. También puedes crear una plantilla con `ares config init --provider openrouter` y editarla localmente:

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

La CLI admite **Ollama local, OpenRouter, Gemini, Mistral, Groq y Cohere**, además de servidores compatibles. Cada proveedor de nube usa su propia clave y un endpoint oficial fijo. `ares providers` muestra perfiles y presencia de credenciales, sin mostrarlas ni realizar consultas de IA.

| Proveedor  | Clave local                     | Modelo del perfil  |
| ---------- | ------------------------------- | ------------------ |
| OpenRouter | `OPENROUTER_API_KEY`            | `OPENROUTER_MODEL` |
| Gemini     | `GEMINI_API_KEY`                | `GEMINI_MODEL`     |
| Mistral    | `MISTRAL_API_KEY`               | `MISTRAL_MODEL`    |
| Groq       | `GROQ_API_KEY`                  | `GROQ_MODEL`       |
| Cohere     | `COHERE_API_KEY`                | `COHERE_MODEL`     |
| Compatible | `COMPATIBLE_API_KEY` (opcional) | `COMPATIBLE_MODEL` |
| Ollama     | No requiere clave; ARES no envía Authorization | `OLLAMA_MODEL` |

```cmd
ares models --provider groq
ares config set --provider groq --model ID_DEL_CATALOGO
ares doctor --probe
```

`config set` conserva el modelo de cada proveedor para volver a elegirlo después. `ARES_MODEL` continúa como selección general del proveedor activo; al cambiar de proveedor se usa su propio perfil. Flags, proceso, archivo del proyecto y archivo personal conservan su precedencia; `--model` selecciona explícitamente para una consulta. Cambiar de proveedor desde el REPL con `/provider gemini` es temporal; `/providers` lista perfiles y `/model ID` cambia el modelo de la terminal.

Un catálogo accesible o una clave presente no garantizan cuota o acceso a todos los modelos. `doctor --probe` comprueba generación real, y un HTTP 429 se conserva como error del proveedor. ARES no cambia silenciosamente de servicio al encontrarlo.

`config set --provider compatible --model ID --base-url http://127.0.0.1:11434/v1` actualiza la configuración personal. Para automatizar una clave, suminístrala por una tubería segura a `config set --key-stdin`; nunca como argumento ni con un comando que la deje en el historial. Cada proveedor usa su propia variable de clave. El alias genérico `ARES_API_KEY_DIRECT` debe migrarse a esa variable o mediante `config set --key-stdin`.

La configuración se resuelve en este orden: flags, variables del proceso, `.env` del directorio actual y `.env` personal. `ARES_HOME` cambia la ubicación de los datos; `ARES_ENV_FILE` selecciona otro archivo de configuración. La plantilla específica del CLI está en [cli/.env.example](cli/.env.example). El `.env.example` de la raíz corresponde al backend histórico.

```cmd
ares doctor --probe
ares ask "Ayúdame a definir las invariantes de mi agregado"
ares ask "Revisa los límites de estos contextos" --context .
ares
```

`doctor` comprueba la configuración local. Solo `doctor --probe` verifica la conexión mediante una consulta real, que puede consumir cuota del proveedor.

Consulta los identificadores actuales con `ares models --filter TEXTO`. El catálogo no garantiza acceso ni cuota; `doctor --probe` realiza la comprobación de inferencia.

La sesión interactiva admite `/help`, `/new`, `/history`, `/sessions`, `/resume ID`, `/search PALABRAS`, `/context RUTA`, `/doctor`, `/models`, `/model ID` y `/exit`. También permite `/audit`, `/analyze`, `/forge`, `/doc`, `/test`, `/propose`, `/diff`, `/apply`, `/verify` y `/restore` con las mismas opciones que la CLI. Las rutas con espacios van entre comillas. Tab completa los comandos. Ctrl+C cancela una operación en curso; los turnos incompletos no se guardan como exitosos.

## 🧠 IA local opcional, evaluación y métricas

Cada integrante elige el motor según su equipo. Instalar Ollama es opcional: los perfiles de nube siguen disponibles. ARES no descarga motores ni modelos automáticamente. Para una primera instalación usa [Ollama oficial](https://ollama.com/download); puedes guardar sus modelos en otro disco con `OLLAMA_MODELS`. Para un motor estrictamente local configura `OLLAMA_NO_CLOUD=1` antes de iniciarlo.

```cmd
ares local hardware --json
ollama pull qwen2.5-coder:7b
ares local models
ares local use qwen2.5-coder:7b --context auto
ares local status
ares doctor --probe
ares
```

El modelo del ejemplo ocupa aproximadamente 4,7 GB; su id y disponibilidad pertenecen al catálogo de Ollama. `local use` valida que hay pesos locales y capacidad de texto antes de guardar la selección personal. El proveedor `ollama` acepta solamente loopback, rechaza referencias remotas y no cambia a nube al fallar. Un servidor `compatible` sigue siendo una opción distinta y no garantiza inferencia local.

El presupuesto automático usa memoria disponible y capacidad declarada del modelo. Es una heurística conservadora, no una garantía de que un modelo cabrá en cualquier equipo. En Macs sin NVIDIA se usa memoria del sistema como referencia; el piloto debe confirmar el comportamiento. La entrada se limita con bytes UTF-8 como estimación conservadora, se reservan tokens para salida y se conserva historial por pares completos. Los archivos que no caben se omiten completos; una instrucción demasiado grande se rechaza antes de generar. Contextos mayores necesitan medición real.

```cmd
ares local use qwen2.5-coder:7b --context 8192
ares config set --max-tokens 1024 --timeout-ms 120000
ares config set --local-context auto
ares metrics --limit 20 --json
ares config set --provider openrouter
```

`ARES_LOCAL_CONTEXT` admite `auto` (ausencia de valor) o 2048..32768; `ARES_MAX_TOKENS` limita la salida y `ARES_TIMEOUT_MS` la duración. En Ollama la salida efectiva se limita también a un cuarto del contexto. `local status` muestra ese presupuesto real. La selección por flags, entorno o proyecto puede tener precedencia sobre el archivo personal.

Las métricas se guardan en `inference-metrics.db` dentro de `ARES_HOME`, separadas del historial: instante, modelo, estado, duración, primer fragmento y tokens cuando se reportan. Ollama añade tiempo de carga y generación; `metrics --json` calcula tokens/segundo si existen esos datos. No se almacenan consultas, código o cuerpos de error en esta base. La cuota, el saldo y los precios de nube no se deducen de esos contadores.

Para comparar explícitamente local y nube:

```cmd
ares evaluate --local-model qwen2.5-coder:7b --cloud-provider openrouter --cloud-model ID_DISPONIBLE --runs 2 -o comparacion.json
```

La suite tiene tres tareas sintéticas de invariantes, idempotencia y lectura de JavaScript. Envía los mismos mensajes y límite de salida a ambos modelos, valida JSON contra resultados esperados y registra errores como fallos. Hace seis solicitudes por repetición; no ejecuta código generado ni acredita calidad general de programación. No envía fuentes del proyecto. Un informe existente se rechaza antes de consultar modelos.

En el REPL están disponibles `/local`, `/metrics` y `/evaluate`. Consulta el [piloto para cinco personas](docs/PILOT.md), la [decisión de arquitectura](docs/adr/0008-local-inference.md) y la [evidencia de esta versión](docs/VALIDATION-5.7.md).

## Arquitectura e historial sin IA

`ares analyze RUTA` analiza imports y reexportaciones de JavaScript/TypeScript, además de bloques script de Vue. Informa dependencias, infracciones entre capas inferidas por directorio, grupos con ciclos y referencias sin resolver. Reconoce imports de tipos, llamadas literales a `require` e `import()`, y alias locales de `tsconfig.json`. No ejecuta el código ni hereda configuraciones externas.

```cmd
ares analyze cli/src --fail-on any -o arquitectura.md
ares sessions search "dominio inventario" --limit 10
ares sessions show PREFIJO_DE_ID
```

`--fail-on any` falla ante infracciones, ciclos, errores de parseo, imports sin resolver, una instantánea truncada o ausencia de módulos compatibles. Los lenguajes no soportados se identifican; no se certifican. `audit` sigue siendo una inspección heurística diferente.

La búsqueda local usa palabras presentes en títulos, consultas y respuestas, sin distinguir mayúsculas ni tildes. Las palabras se combinan con AND; no interpreta operadores SQL o FTS. Sesiones, propuestas y verificaciones aceptan un prefijo único de al menos 8 caracteres. Si es ambiguo, la operación se detiene.

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
    {
      "path": "docs/nota.md",
      "content": "# Decisión\n\nEl dominio no depende de SQLite.\n"
    }
  ]
}
```

```cmd
ares propose --from cambios.json --path "D:\mi-proyecto"
```

`content` contiene el archivo completo; `null` solicita su eliminación. Revisa siempre que el diff corresponda al requerimiento. Los tests verdes no justifican cambios ajenos al alcance.

## Comandos

| Comando                                                        | Resultado                                                                          |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `ares` / `ares repl`                                           | Conversación interactiva con historial local.                                      |
| `ares ask "consulta" --context RUTA`                           | Respuesta con streaming real; `--session ID` continúa una conversación.            |
| `ares doctor [--probe]`                                        | Diagnóstico; la consulta de IA es explícita.                                       |
| `ares models [--filter TEXTO]`                                 | Catálogo actual del proveedor, sin fijar IDs en el código.                         |
| `ares providers`                                               | Perfiles locales y presencia de claves, sin exponer valores ni comprobar conexión. |
| `ares setup`                                                   | Asistente de configuración con entrada oculta para la clave.                       |
| `ares config init` / `show` / `set`                            | Crear, consultar y actualizar configuración local sin mostrar claves.              |
| `ares context RUTA [--content]`                                | Archivos seleccionados; contenido redactado opcional. No llama a IA.               |
| `ares audit RUTA [--ai]`                                       | Señales estáticas con ruta y línea; revisión de IA opcional.                       |
| `ares analyze RUTA [--fail-on any]`                            | Grafo de imports mediante AST, límites de capas y ciclos; sin IA.                  |
| `ares doc adr "instrucción" --context RUTA -o salida.md`       | Documento de IA: `readme`, `adr`, `rfc`, `openapi` o `c4`.                         |
| `ares test archivo.ts -f node:test -o propuesta.test.ts`       | Tests propuestos por IA; no se ejecutan automáticamente.                           |
| `ares forge NUEVA_CARPETA`                                     | Plantilla CLI DDD de tareas, sin IA.                                               |
| `ares zip CARPETA salida.zip`                                  | ZIP de fuentes filtradas y redactadas; no es copia exacta ni incluye binarios.     |
| `ares sessions list` / `show ID` / `export ID -o historial.md` | Consulta y exportación de sesiones.                                                |
| `ares sessions search "palabras" --limit 10`                   | Búsqueda local de texto completo con SQLite FTS5.                                  |
| `ares propose`, `diff ID`, `apply ID`, `restore ID`            | Flujo de cambios revisables con recuperación.                                      |
| `ares proposals`                                               | Últimas 50 propuestas y sus estados.                                               |
| `ares verify [ID] --path RUTA --script test`                   | Ejecuta un script explícito y guarda evidencia asociada a fuentes y propuesta.     |
| `ares verifications list` / `show ID`                          | Consulta resultados reales y su correspondencia con el estado actual.              |

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
- La primera apertura de una base CLI de esquema 1, 2 o 3 crea una copia consistente `ares-schema-N-backup-UUID.sqlite` antes de migrarla al esquema 4. La copia conserva datos sensibles igual que el original. Para volver a una CLI anterior, conserva el archivo original migrado y restaura la copia como `ares.sqlite` en otro `ARES_HOME` vacío con todas las terminales ARES cerradas.
- `audit` no certifica seguridad, no calcula una puntuación SOLID y no inventa métricas. `test` no presenta tests generados como ejecutados.
- La aplicación de cambios es recuperable, con reemplazo individual de archivos. No proporciona una transacción global frente a editores u otros procesos externos.

## Desarrollo y verificación

```cmd
npm run setup
npm run check
```

Las pruebas cubren invariantes, dirección de dependencias, persistencia real, concurrencia, HTTP/SSE fragmentado, errores, timeouts, exclusión de secretos y el ciclo de propuesta/aplicación/restauración. También ejecutan la CLI generada y sus tests. El servidor HTTP de las pruebas es controlado; el acceso a proveedores comerciales se verifica aparte con `doctor --probe`.

Para crear la distribución portable con dependencias de ejecución fijadas: `npm run portable`. Para extraerla y comprobar arranque, wrapper, configuración, análisis AST y tests del proyecto generado: `npm run smoke:portable`. El ZIP requiere Node.js 24 o superior y no requiere `npm install` en el equipo de destino.

La CI incluye Windows y Ubuntu con Node 24 y 26; Node 24 también construye y ejecuta el portable y el paquete npm en instalaciones aisladas. Sentinel comprueba la arquitectura con AST y publica el informe en el resumen de Actions, sin claves de IA ni comentarios automáticos. Consulta el resultado de cada ejecución en GitHub Actions. La configuración de una matriz no equivale a sus resultados. Detalles: [arquitectura y límites](docs/ARCHITECTURE.md), [decisiones](docs/adr/0001-cli-first.md), [validación 5.6](docs/VALIDATION-5.6.md) y [trabajo pendiente](docs/ROADMAP.md).

## Componentes históricos

`backend/`, `frontend/`, `mcp/` y `hooks/` se conservan por separado. La CLI 5 no necesita esos servicios ni usa `ARES_API_URL`. Comandos antiguos como `bio`, `route`, `benchmark`, `swarm` y `setup-git` no forman parte de esta nueva CLI. `chat` continúa como alias de `ask`; `forge` ahora crea la plantilla local descrita arriba.

La [documentación de la web v4](docs/legacy-web-v4.md) es un archivo histórico; sus capacidades y resultados no se presentan como verificación de la nueva CLI.

Creado por Kevin / AI Innovation. Licencia [MIT](LICENSE).
