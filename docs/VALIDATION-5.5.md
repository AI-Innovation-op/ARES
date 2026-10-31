# Validación de ARES CLI 5.5

Fecha local: 2026-10-31. Windows, Node.js 24.21.0.

## Comprobaciones

Formato, tipos, compilación, 93 pruebas aprobadas y análisis de 36 módulos sin infracciones de arquitectura.

- Registro por alias, preferencias, selección por @alias en CLI y REPL y reinicio de contexto al cerrar.
- Conversación HTTP con servidor de pruebas: continuación después de mover una carpeta, contexto nuevo e identidad estable; rechazo de otro proyecto antes de realizar una petición.
- Sustitución de una carpeta en la misma ruta detectada mediante identidad del directorio cuando está disponible.
- Registro y vinculación de sesiones atómicos, FTS conservado, revisiones de proyecto con control de concurrencia y rechazo de escrituras que pierden una identidad asignada.
- Migración desde esquema 3 con copia consistente previa y sin cambiar la conversación ni el índice. Se mantienen las pruebas de migración 1/2.
- Precedencia de preferencias frente a flags, proceso y .env, sin reutilizar modelos o URLs de otro proveedor.
- ARES_HOME relativo anclado al directorio de inicio, sin crear datos privados en el proyecto abierto.
- Paquetes portable y npm comprobados mediante instalación aislada, resolución de alias y ejecución real del proyecto generado.

Las pruebas HTTP controladas no acreditan disponibilidad o cuota de un proveedor comercial. Las preferencias no almacenan credenciales y el registro no crea archivos dentro del proyecto. La reubicación no mueve archivos y no reasigna propuestas o verificaciones antiguas.

## Prueba adicional con IA real

Se ejecutaron dos consultas a OpenRouter en un proyecto de un archivo, con historial temporal y el archivo privado de credenciales existente. La primera identificó el literal HELLO_BEFORE. Después de mover la carpeta, cambiar el archivo a HELLO_AFTER y actualizar el registro, se continuó la misma sesión: identificó el nuevo literal, conservó projectId y alcanzó la revisión 2. No se copiaron claves ni se abrió la base personal. Es una prueba puntual de integración, no una tasa general de éxito del modelo.
