# Validación local de ARES CLI 5

Fecha: 2026-10-30 (America/Lima).

Base clonada: `AI-Innovation-op/ARES`, commit `a23fcc4` de `main`.
Rama de trabajo: `codex/cli-ddd`.
Entorno ejecutado: Windows, Node.js `v24.21.0`, npm `11.19.0`, Git `2.51.2.windows.1`.

## Resultado ejecutado

| Comprobación | Resultado |
|---|---|
| `npm run check` desde `cli/` | Tipos y compilación correctos; 35 pruebas aprobadas, 0 fallos, 0 omitidas. |
| Dominio y límites arquitectónicos | Invariantes y transiciones; imports analizados con AST de TypeScript. |
| Conversaciones | SQLite real, cierre y reapertura, continuación desde otro proceso y conflicto de revisión. |
| Transporte IA | HTTP local real, SSE fragmentado, UTF-8, Markdown, historial y propuesta de archivos. El contenido lo devuelve un proveedor controlado de pruebas. |
| Fallos de proveedor | HTTP 401, eventos inválidos, stream incompleto, límite de tokens, error intermedio y timeout: devuelven fallo sin guardar un turno exitoso. |
| Propuestas | Importación local y generación vía HTTP, diff, aplicación, restauración y conflicto antes de escribir. |
| Recuperación | Fallo de escritura inyectado con rollback; estado `applying` recuperado desde un proceso nuevo. |
| Fuentes | Reglas de exclusión superiores y anidadas, límites, binarios, junctions, rutas privadas y redacción. |
| Plantilla generada | Ejecución, persistencia entre procesos, comprobación de tipos y sus 3 tests de dominio/persistencia. Sin instalar dependencias para ejecutarla o correr sus tests. |
| CMD real | `ares.cmd doctor --json`, error de configuración con código 2, generación en una ruta con espacios, ejecución del proyecto y 3 tests aprobados. |
| Sesión TTY real | Arranque mediante `cmd.exe`, `/help`, `/doctor` y salida con `/exit`. |
| Instalador real | `install.bat --local --no-pause` completado con código 0. No se cambió la instalación global ni la política de PowerShell. |
| Dependencias CLI | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades conocidas en ese momento. |
| Paquete | `npm pack`, instalación en una carpeta de pruebas y ejecución del shim `ares.cmd` del paquete instalado. Compilación limpia, sin módulos antiguos en `dist`. |
| Portable Windows | ZIP con dependencias de ejecución incluidas, extraído en otra carpeta con espacios; `ares.cmd doctor --json` y `forge` completados sin `npm install`. Requiere Node.js 24 o superior. |

## Lo que no acredita esta validación

- No se configuró una clave comercial ni se ejecutó `doctor --probe` contra Gemini u OpenRouter. El diagnóstico informa esa situación. La calidad de las respuestas requiere una prueba con el proveedor y modelo elegidos por el usuario.
- La matriz de CI para Ubuntu y Node 26 está definida, pero no se afirma una ejecución remota ya aprobada.
- No se recompilaron ni auditaron el backend, la web o el MCP históricos. Sus dependencias y funciones permanecen separadas del CLI 5.
- No se publicaron paquetes, releases, cambios en `main` ni despliegues.

## Reproducir

```cmd
npm run setup
npm run check
ares.cmd doctor --json
ares.cmd audit cli/src --json
```

Para verificar el proveedor real, primero edita localmente la configuración creada con `ares.cmd config init` y luego ejecuta `ares.cmd doctor --probe`.

La carpeta de Documentos impidió crear archivos tanto a Git como a las herramientas de copia de Windows. El trabajo se realizó en la otra raíz autorizada de esta sesión. Esta limitación del entorno no se confundió con un fallo del CLI.

Entregable portable: `.artifacts/ARES-5.0.0-Windows-portable.zip`.
SHA-256: `d57c3b0d7a76f9797e91e27b4cb2632bddb89b64ddfca667606d5066d01770e4`.
