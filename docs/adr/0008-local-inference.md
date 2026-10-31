# ADR 0008: inferencia local opcional por equipo

Estado: aceptada. Fecha: 2026-10-31.

## Contexto

Cinco integrantes usan equipos de capacidades diferentes en casa y en el trabajo. ARES ya dispone de puertos de modelos y adaptadores de nube. El límite de 100 000 caracteres de fuentes resulta excesivo para un modelo local pequeño.

## Decisión

Añadir `ollama` como adaptador explícito de la API nativa. La interfaz `LanguageModel` conserva streaming de texto y añade presupuesto de entrada y uso opcionales. El dominio `local-budget` calcula límites a partir de valores de memoria y metadatos; no depende del sistema operativo ni de HTTP. `prepareLocal`, mediciones y evaluación son casos de uso con puertos. El adaptador obtiene RAM, memoria NVIDIA cuando está disponible y metadatos de Ollama.

La selección personal no impone un modelo a los demás clones. Solo se admiten motores en loopback; las redirecciones HTTP y modelos con referencias remotas se rechazan. No se envían claves ni existe fallback automático de local a nube. La instalación administrada en este equipo desactiva además las funciones de nube de Ollama.

Presupuestos de contexto de 2048, 4096 u 8192 como heurística inicial; override explícito hasta 32768, limitado por el modelo. La salida ocupa como máximo 1/4 del contexto. Se reserva margen para plantilla y se usa un byte UTF-8 como estimación conservadora de un token de entrada, sin afirmar tokenización exacta. El historial conserva pares y las fuentes conservan archivos completos. Las entradas que exceden el presupuesto final se rechazan antes del POST de generación.

Las métricas usan una SQLite independiente sin migrar el esquema 4 de proyectos y conversaciones. Guardan metadatos de inferencia, no solicitudes ni código. La falta de contadores del proveedor permanece explícita. Un fallo al registrar métricas se comunica y no invalida una respuesta terminada.

## Alternativas

- Mantener solo `/v1/chat/completions`: compatible con Ollama, pero dificulta establecer `num_ctx`, validar pesos locales y obtener tiempos de carga y generación.
- Servidor compartido desde el primer día: añade disponibilidad, autenticación y concurrencia antes de medir una sola máquina. Se pospone al piloto.
- Instalar modelos automáticamente al abrir ARES: añade descargas grandes y consumo de disco inesperados. Los comandos de diagnóstico y selección no descargan nada.

## Consecuencias

Los proveedores actuales conservan sus contratos. Los equipos pequeños pueden usar nube. La política de memoria es orientativa; macOS y equipos sin NVIDIA necesitan pruebas reales del piloto. El motor local y sus pesos son instalaciones externas, separadas del paquete de ARES. No se entrena un modelo propio.

La comparación integrada aplica tres tareas sintéticas con resultado objetivo, no ejecuta código generado y no sustituye aceptación independiente de cambios en proyectos reales. La evidencia inicial de GPU corresponde únicamente a la laptop Windows probada.

Fuentes: [API de chat](https://docs.ollama.com/api/chat), [modelos cargados](https://docs.ollama.com/api/ps), [instalación Windows](https://docs.ollama.com/windows), [funciones de nube y concurrencia](https://docs.ollama.com/faq).
