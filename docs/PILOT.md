# Piloto de ARES para cinco personas

Estado: preparado; la participación de cinco personas reales está pendiente. Los cinco clones automatizados de 5.6 acreditan intercambio técnico, no adopción del equipo.

## 1. Diagnóstico individual

Cada persona instala la misma release de ARES y ejecuta `ares --version`, `ares doctor --json` y `ares local hardware --json`. El último comando funciona sin Ollama, no llama a nube y devuelve plataforma, arquitectura, CPU y memoria, sin nombre del equipo ni número de serie. El JSON de doctor incluye rutas personales: revisarlas antes de compartirlo.

Registrar por persona y lugar de trabajo: versión de ARES, sistema operativo, chip/CPU, RAM, GPU conocida, motor elegido y motivo. No subir claves, bases de datos o historiales a Git. Cada quien conserva su propio clon y `ARES_HOME`.

| Participante | Equipo de casa | Equipo de trabajo | Motor elegido | Prueba completada |
|---|---|---|---|---|
| Kevin | Windows / RTX 4060 Laptop 8 GB / RAM ~16 GB, inferencia local comprobada | Por registrar | Ollama local en laptop; nube disponible | Integración técnica local; aceptación personal pendiente |
| Integrante 2 | Por registrar | Por registrar | Por elegir | Pendiente |
| Integrante 3 | Por registrar | Por registrar | Por elegir | Pendiente |
| Integrante 4 | Por registrar | Por registrar | Por elegir | Pendiente |
| Integrante 5 | Por registrar | Por registrar | Por elegir | Pendiente |

Los equipos de casa pueden usar nube. En equipos con recursos suficientes, instalar Ollama desde su distribución oficial y descargar un modelo adecuado. En macOS comprobar versión, chip y memoria; no asumir aceleración en equipos Intel. No se necesita compartir un motor para compartir propuestas.

## 2. Aceptación en un proyecto real

Elegir una tarea pequeña con criterio verificable antes de preguntar a IA: una invariante, un defecto reproducible o un documento contrastable con el código. Registrar el commit inicial y ejecutar `ares team check` para distinguir fallos previos.

1. Abrir el proyecto con `ares --project RUTA` y revisar fuentes con `context --content`.
2. Pedir una explicación o preparar `propose`. Revisar alcance y diff.
3. Aplicar solamente una propuesta revisada; ejecutar `verify SCRIPT --proposal ID` y el criterio de aceptación independiente.
4. Exportar mediante `handoff export`; otra persona importa en un clon compatible, revisa y ejecuta sus propias pruebas.
5. Confirmar que `restore` recupera el contenido esperado cuando corresponda.
6. Registrar motor/modelo, resultado, omisiones relevantes, defectos, tiempos observados y métricas. No afirmar éxito basándose solo en el resumen del modelo.

## 3. Comparación acotada

Con ambos motores seleccionados explícitamente, ejecutar `evaluate --local-model ID --cloud-provider NOMBRE --cloud-model ID --runs 2 -o informe-nuevo.json`. Seis solicitudes por repetición. La suite no envía el proyecto ni ejecuta código generado. Registrar por separado carga inicial, tiempos posteriores y tokens reportados. El resultado no demuestra rendimiento de cinco usuarios concurrentes.

Para una evaluación real de programación, aplicar por separado las mismas tareas a clones del mismo commit y usar los mismos criterios de aceptación independientes. Alternar el orden de los motores. Incluir casos fallidos y cambios fuera de alcance; conservar evidencias revisadas sin secretos.

## 4. Decisión del equipo

Revisar después de que cada integrante complete al menos una tarea y una revisión de otro compañero. Elegir por tarea según corrección, tiempo total, límites de contexto y necesidad de conectividad. Medir antes de imponer un motor común.

Un servidor de equipo se considera después: acceso privado autenticado, HTTPS, control de concurrencia, disponibilidad y autorización del contenido enviado a esa máquina. La laptop de Kevin no queda configurada como servidor público ni como dependencia de los otros cuatro.
