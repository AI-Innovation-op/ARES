# ADR 0004: hechos de arquitectura, configuración e historial local

Estado: aceptado. Fecha: 2026-10-30.

## Contexto

La CLI necesita inspeccionar dependencias reales sin atribuir a expresiones regulares una comprensión del programa. El historial crece y debe seguir siendo consultable sin enviarlo a un servicio externo. La configuración debe poder completarse desde CMD sin poner claves en argumentos.

## Decisión

- Mantener un contexto de arquitectura con reglas puras para capas y ciclos. Un adaptador usa el AST de TypeScript 5.8.3, fijado como dependencia de ejecución y cargado solo al analizar.
- Resolver módulos exclusivamente dentro de una instantánea con límites explícitos. Informar referencias sin resolver y lenguajes no soportados. La opción estricta falla ante evidencia incompleta relevante, sin inventar una puntuación DDD.
- Reutilizar SQLite FTS5 para buscar palabras locales. Guardar agregado e índice en la misma transacción y respaldar mediante una copia consistente antes de migrar bases existentes al esquema 3.
- Aceptar prefijos únicos de IDs para facilitar el terminal. Rechazar ambigüedades antes de operar.
- Usar entrada oculta en el asistente y stdin para automatización. Separar credenciales por proveedor, validar la configuración antes de reemplazarla y redactar la clave configurada antes de persistir un stream.
- Sustituir Sentinel dependiente de claves comerciales por una comprobación AST de solo lectura cuyo resultado corresponde a trabajo ejecutado.

## Consecuencias

El portable aumenta de tamaño porque incluye el compilador como parser, pero funciona sin instalar dependencias. El análisis no reemplaza compilación, tests o revisión de negocio; los aliases heredados y imports calculados conservan límites explícitos. FTS5 añade un índice privado junto al historial y requiere CLI 5.2 o posterior. La base y sus copias no están cifradas por ARES.
