# Trabajo pendiente de ARES

Actualizado: 2026-10-31. Este documento separa capacidades ejecutadas de trabajo futuro.

## Base comprobada

CLI independiente, identidad visual original, proveedores y modelos por perfil, historial local, análisis AST, cambios revisables, verificación y recuperación. La 5.4 añadió proyecto activo e instalación independiente. La 5.5 incorporó alias, preferencias e identidad estable. La 5.6 añade acuerdos versionados, comprobaciones compartidas y propuestas portables entre clones de un equipo de cinco. El ciclo de programación se probó con IA real y aceptación independiente; eso no equivale a certificar cualquier cambio generado.

La web 4.6 incorpora conversación con streaming, conexión autenticada, historial del servidor y el avatar articulado de 16 poses. Su API y el núcleo CLI siguen separados; el estado y los límites de la interfaz están en la [guía web](web-avatar.md).

## Prioridades de la web para el equipo de cinco

1. **Persistencia y recuperación:** sacar conversaciones y memoria del almacenamiento efímero del backend; definir copias y comprobar una restauración antes de tratarlo como archivo de trabajo del equipo. La elección del servicio y su coste quedan por decidir.
2. **Accesos individuales y consumo:** sustituir la clave compartida por identidades por persona, definir qué conversaciones son privadas o compartidas y añadir presupuestos y métricas de IA a la web. La limitación HTTP actual no sustituye un presupuesto de tokens o gasto por usuario.
3. **Piloto humano:** usar tareas reales con los cinco integrantes y registrar resultados en sus equipos. Incluir Windows/macOS, modelos locales/nube de la CLI, la web, vista ligera, teclado y pruebas físicas de voz. Las pruebas automatizadas no reemplazan esta validación.
4. **Alineación gradual de interfaces:** reutilizar reglas y casos de uso compatibles de la CLI mediante adaptadores explícitos. Llevar a la web los proveedores y métricas que se necesiten; la ejecución local de archivos y Ollama requiere un diseño de acceso propio y no se habilita por compartir una URL.

El siguiente paso técnico prioritario es la persistencia del historial web. El piloto de la CLI puede seguir en paralelo con la [guía de validación](PILOT.md).

## Prioridad siguiente

Los siguientes puntos corresponden al núcleo CLI:

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
