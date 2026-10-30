# Validación de ARES CLI 5.1

Fecha local: 2026-10-30, America/Lima. Windows, Node.js 24.21.0 y npm 11.19.0.
Continuación de `09ec781` sobre la base `a23fcc4` del repositorio original.

## Comprobaciones ejecutadas localmente

| Comprobación | Resultado |
|---|---|
| CLI: `npm run check` | Formato, tipos, compilación y **52 pruebas aprobadas**, sin fallos ni omitidas. |
| Ejecución de scripts | Procesos reales de Node, salida y errores reales, duración medida y evidencia SQLite consultable desde otro proceso. |
| Fallos y cancelación | Script fallido, script inexistente, nombre inválido, timeout con terminación de descendientes y cancelación con evidencia persistida. |
| Validez de evidencia | Cambios durante la ejecución producen `stale`; consulta posterior conserva el resultado histórico y muestra su correspondencia actual. |
| Persistencia | Migración del esquema 1 al 2 sin perder la conversación de prueba; control de revisiones y copias de propuestas. |
| Bloqueos | Un proceso hijo adquiere el bloqueo, otro proceso queda excluido, el dueño es terminado y un nuevo proceso puede adquirirlo sin borrar archivos obsoletos. |
| Propuestas | Regresión corregida: un archivo eliminado tras la instantánea no se convierte silenciosamente en una creación. Los cambios de IA no editan archivos existentes omitidos del contexto enviado. |
| Protocolo HTTP | SSE con UTF-8 fragmentado y separadores LF/CRLF/CR, validación de terminaciones, errores, JSON y timeout mediante proveedor local de prueba. |
| Catálogo comercial | `ares.cmd models --provider openrouter --limit 3 --json` completado contra el catálogo real de OpenRouter. Esta lectura no es una inferencia de IA. |
| Sesión interactiva | Auditoría local con ruta entre comillas, cambio de modelo y consulta contextual posterior, comandos de ayuda y continuidad de sesiones. |
| Portable | `npm run portable` instala solo runtime desde el lockfile, sin scripts de instalación. `npm run smoke:portable` extrae el ZIP en una ruta con espacios, prueba el wrapper CMD, genera un proyecto y ejecuta sus tests mediante `verify`. |
| Backend histórico | Compilación y **11 pruebas aprobadas**. |
| Web histórica | Tipos y compilación Vite completados. Mantiene una advertencia de chunks grandes. |
| MCP histórico | Compilación completada. |
| Dependencias de producción | `npm audit --omit=dev --audit-level=high`: **0 vulnerabilidades conocidas** en CLI, backend, frontend y MCP en esta revisión. |

## Entregables y reproducción

```cmd
npm run setup
npm run check
npm run portable
npm run smoke:portable
```

Los entregables se generan en `.artifacts/`. El portable contiene el runtime y las dependencias de ejecución; requiere Node.js 24 o superior. No incluye el ejecutable de Node ni las herramientas de desarrollo. Su manifiesto registra versión, número de archivos, tamaño y SHA-256. La compilación usa LF y el ZIP ordena entradas y fija sus fechas para poder comparar construcciones del mismo código y lockfile.

La CI comprueba Windows y Ubuntu con Node 24 y 26. En Node 24 también crea y ejecuta el portable. Los resultados remotos deben consultarse en la [ejecución de CI](https://github.com/AI-Innovation-op/ARES/actions/workflows/ci.yml) de la revisión correspondiente; esta tabla describe las comprobaciones locales.

## Límites pendientes de una configuración real

La generación comercial de respuestas no se probó sin una clave local del usuario. El catálogo real y el transporte de pruebas no sustituyen `doctor --probe` con el proveedor y modelo que se vayan a usar.

La verificación ejecuta un script explícito con permisos del usuario. No es un sandbox ni una certificación de seguridad. Su huella cubre las fuentes seleccionadas y el manifiesto, con límites y exclusiones visibles; no todas las dependencias o archivos leídos por el proceso. No se inventan métricas de cobertura, mutación o carga.

El historial y las copias siguen siendo locales y sin cifrado propio. La migración al esquema 2 requiere usar CLI 5.1 o posterior para abrir esa base. El paquete de la web es independiente y su optimización de tamaño no forma parte de la ejecución CLI.
