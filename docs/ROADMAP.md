# Trabajo pendiente de ARES

Actualizado: 2026-10-31. Este documento separa capacidades ejecutadas de trabajo futuro.

## Base comprobada

CLI independiente, identidad visual original, proveedores y modelos por perfil, historial local, análisis AST, cambios revisables, verificación y recuperación. La 5.4 añadió proyecto activo e instalación independiente. La 5.5 incorporó alias, preferencias e identidad estable. La 5.6 añade acuerdos versionados, comprobaciones compartidas y propuestas portables entre clones de un equipo de cinco. El ciclo de programación se probó con IA real y aceptación independiente; eso no equivale a certificar cualquier cambio generado.

## Prioridad siguiente

1. **Piloto con cinco personas:** 5.7 incorpora inferencia Ollama opcional, presupuestos por equipo y métricas de duración/tokens reportados. Completar la [validación humana](PILOT.md) en casa y trabajo; macOS y laptops pequeñas requieren medición propia. Los costes deben proceder de información real del servicio; no de métricas simuladas.
2. **Evaluación reproducible de cambios:** la mini-suite de 5.7 compara tres tareas sintéticas de resultado objetivo. Ampliar con cambios de referencia y aceptación independiente para medir completitud, regresiones y alcance. Separar corrección del código y calidad del resumen generado.
3. **Actualización y recuperación de versiones:** actualización explícita desde artefactos verificados, selección de versión y retorno a una copia compatible de los datos.

## Capacidades opcionales

- Revisión con varios modelos elegidos explícitamente, con límites de uso y contexto enviado visibles.
- Integración MCP directa con herramientas acotadas y escrituras revisables.
- Voz de entrada/salida como adaptador opcional de la CLI, con pruebas físicas de micrófono y cierre de mensaje. La CLI debe seguir siendo plenamente usable con teclado.

No se recuperarán como capacidades reales los benchmarks ficticios o una ejecución de scripts generados sin revisión.

## Dependencias externas

La cuenta de Mistral devolvió HTTP 429 en la última prueba de generación. Su cuota y disponibilidad se resuelven en el servicio; la integración no altera planes o cuentas. Los modelos y tarifas pueden cambiar, por lo que catálogo y probe siguen siendo comprobaciones puntuales.
