# Trabajo pendiente de ARES

Actualizado: 2026-10-31. Este documento separa capacidades ejecutadas de trabajo futuro.

## Base comprobada

CLI independiente, identidad visual original, proveedores y modelos por perfil, historial local, análisis AST, cambios revisables, verificación y recuperación. La 5.4 añade proyecto activo, vínculo de conversaciones e instalación global independiente. El ciclo de programación se probó con IA real y aceptación independiente; eso no equivale a certificar cualquier cambio generado.

## Prioridad siguiente

1. **Identidad persistente de proyectos:** alias, preferencias por proyecto y reubicación de carpetas con un vínculo explícito de las sesiones. Hoy la identidad utiliza la ruta canónica.
2. **Evidencia de consumo de IA:** tokens y duración cuando el proveedor los reporte, con ausencia explícita de datos y límites configurables. Los costes deben proceder de información real del servicio; no de métricas simuladas.
3. **Evaluación reproducible de tareas:** un conjunto de cambios de referencia con aceptación independiente para medir completitud, regresiones y alcance. Separar corrección del código y calidad del resumen generado.
4. **Actualización y recuperación de versiones:** actualización explícita desde artefactos verificados, selección de versión y retorno a una copia compatible de los datos.

## Capacidades opcionales

- Revisión con varios modelos elegidos explícitamente, con límites de uso y contexto enviado visibles.
- Integración MCP directa con herramientas acotadas y escrituras revisables.
- Voz de entrada/salida como adaptador opcional de la CLI, con pruebas físicas de micrófono y cierre de mensaje. La CLI debe seguir siendo plenamente usable con teclado.

No se recuperarán como capacidades reales los benchmarks ficticios o una ejecución de scripts generados sin revisión.

## Dependencias externas

La cuenta de Mistral devolvió HTTP 429 en la última prueba de generación. Su cuota y disponibilidad se resuelven en el servicio; la integración no altera planes o cuentas. Los modelos y tarifas pueden cambiar, por lo que catálogo y probe siguen siendo comprobaciones puntuales.
