# Validación de ARES CLI 5.6

Fecha local: 2026-10-31. Windows, Node.js 24.21.0.

- 103 pruebas, formato, tipos y 41 módulos sin infracciones de arquitectura.
- team check ejecutó el acuerdo real de ARES y registró el resultado de su script check.
- Cinco clones con cinco directorios de datos distintos intercambiaron una propuesta: inspección de integridad, importación sin escritura, revisión del diff, aplicación, tests reales en cada copia y restauración exacta.
- Se incluyeron clones con LF/CRLF y un paquete UTF-8 con BOM.
- Una propuesta aplicada exportó el mismo cambio portable que antes de aplicarse.
- Rechazo de paquetes alterados, versiones desconocidas, rutas privadas, contenidos demasiado grandes, enlaces y clones divergentes, sin crear propuestas parciales.
- Detección de credenciales conocidas antes de validar o mostrar entradas y antes de escribir una exportación.
- Las comprobaciones compartidas prevalidan todos los scripts y registran fallos reales; los scripts restantes quedan marcados como no ejecutados.
- Los paquetes portable y npm ejecutan team init/check desde instalaciones aisladas. El tarball también exporta e inspecciona una propuesta.

Esta versión se validó con procesos, archivos y SQLite reales; no requiere llamadas a IA para compartir cambios o ejecutar comprobaciones. No afirma haber sido usada físicamente por cinco personas: la prueba automatizada representa cinco clones e historiales independientes.

La integridad del paquete no acredita autoría. Las claves e historiales permanecen locales, y la revisión del contenido y su procedencia se realizan mediante el flujo del equipo.
