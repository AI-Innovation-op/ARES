# Validación de ARES CLI 5.2

Fecha local: 2026-10-30, America/Lima. Windows, Node.js 24.21.0 y npm 11.19.0.
Continuación de la CLI 5.1 sobre la base original `a23fcc4`.

## Comprobaciones ejecutadas

| Comprobación | Evidencia |
|---|---|
| CLI: `npm run check` | Formato, tipos, compilación, **71 pruebas aprobadas**, sin fallos ni omitidas, y análisis de sus propios imports. |
| Arquitectura propia | 32 módulos analizados; cero infracciones, ciclos, errores de parseo e imports sin resolver. |
| Parser | Imports, reexportaciones, tipos, require/import literales, alias locales, ciclos, Vue con JSX y líneas de origen. Comentarios y cadenas no producen imports falsos. |
| Gate | Código de salida según criterio, informe exportable sin sobrescribir archivos y rechazo de imports sin resolver en modo estricto. |
| Configuración | Escritura y lectura reales, preservación de contenido ajeno, actualización rechazada sin alterar el archivo, credencial por proveedor y stdin validado sin exponer la entrada. |
| Terminal real | Asistente completado en una TTY Windows con proveedor compatible y clave ficticia. La clave no apareció en la salida. No se usaron credenciales del usuario. |
| Privacidad del stream | Clave ficticia dividida en cada posición posible y respuesta HTTP que la devuelve: salida, conversación persistida e índice contienen redacción. |
| Historial | Búsqueda por título y contenido, tildes, consultas literales, índice conservado tras conflicto y prefijos ambiguos rechazados. |
| Migración | Base de esquema 2 respaldada de forma consistente y migrada al 3 conservando datos; la copia mantiene el esquema anterior. |
| Flujo de cambios | Aplicación, restauración y verificación con prefijos cortos; conflictos y recuperación mantienen las comprobaciones de 5.1. |
| Portable extraído | Wrapper CMD, diagnóstico, configuración persistente, parser AST real y plantilla generada con sus tests mediante verify. Entorno temporal aislado sin credenciales heredadas. |
| Dependencias CLI de producción | `npm audit --omit=dev --audit-level=high`: cero vulnerabilidades conocidas en esta revisión. |

Los procesos, SQLite y el transporte HTTP de pruebas son reales. El proveedor HTTP es una fixture local controlada; no demuestra calidad del razonamiento ni acceso comercial. La prueba del asistente fue manual; la CI comprueba la alternativa por stdin y el rechazo de entradas no interactivas.

## Reproducción

```cmd
npm run setup
npm run check
npm run portable
npm run smoke:portable
```

El manifiesto del ZIP registra versión, tamaño, archivos y SHA-256. La CI ejecuta la CLI en Windows y Ubuntu con Node 24 y 26; Node 24 también construye y ejecuta el portable. Sentinel genera un informe AST sin claves ni permisos para comentar. Consulta resultados de cada revisión en [CI](https://github.com/AI-Innovation-op/ARES/actions/workflows/ci.yml) y [Sentinel](https://github.com/AI-Innovation-op/ARES/actions/workflows/ares-sentinel.yml).

## Límites de esta entrega

La inferencia con una cuenta comercial requiere una clave local y se comprueba mediante `ares doctor --probe`; no se atribuye esa prueba a las fixtures. El análisis estático no certifica DDD, seguridad o comportamiento en ejecución, ni evalúa configuraciones heredadas fuera de la instantánea.

Historial, índice y copias son datos locales privados sin cifrado propio. La redacción de la clave configurada cubre nuevas operaciones, sin limpiar retrospectivamente registros antiguos. El esquema 3 requiere CLI 5.2 o posterior. La verificación de scripts ejecuta código explícitamente elegido con los permisos del usuario.

Los resultados anteriores de backend, web y MCP están documentados en [validación 5.1](VALIDATION-5.1.md); sus fuentes no cambian en 5.2. Los resultados actuales de esos componentes se consultan en la ejecución remota de CI.
