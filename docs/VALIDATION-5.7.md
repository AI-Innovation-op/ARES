# Validación de ARES 5.7

Fecha: 2026-10-31. Plataforma local: Windows, Node 24.21.0, AMD Ryzen 7 7735HS, RAM utilizable 15,24 GiB, RTX 4060 Laptop 8 GB.

## Implementado

- Proveedor Ollama nativo, selección de modelos con pesos locales y diagnóstico de hardware sin instalar el motor.
- Presupuesto conservador según memoria disponible y capacidad del modelo; cuenta memoria del modelo ya residente para evitar cambios de presupuesto causados solo por su carga.
- Límites explícitos de contexto, salida y timeout; historial por pares completos, archivos completos dentro del contexto y rechazo de entrada demasiado grande antes de generar.
- Métricas privadas separadas de conversaciones: duración, primer fragmento, estado y uso reportado. No almacena consultas o fuentes en la base de métricas.
- Comparación explícita de tres tareas sintéticas entre local y nube, con informes JSON y prevalidación del archivo de salida.
- [Guía del piloto para cinco personas](PILOT.md). El piloto humano sigue pendiente.

## Pruebas automatizadas

`npm run check`: 111 pruebas aprobadas, formato y tipos correctos, 48 módulos analizados sin infracciones de capas, ciclos o imports sin resolver. Las ocho pruebas nuevas incluyen memoria/residencia, bloqueo de referencias remotas, streaming UTF-8 fragmentado, límites antes del POST, interrupción/truncamiento, cancelación/timeout, metadatos privados, diagnóstico sin motor, evaluación y selección CLI sin perder perfiles de nube.

`portable`, `smoke:portable`, `package:npm` y `smoke:npm`: aprobados en Windows. Las distribuciones se prueban mediante copias independientes y datos temporales. Los modelos y el motor no forman parte del paquete de ARES.

## Inferencia real

Ollama 0.40.13 instalado desde su release oficial; SHA256 del instalador contrastado con la release y firma Authenticode válida de Ollama Inc. Motor en loopback, `OLLAMA_NO_CLOUD=1`, modelos en `D:\ARES\models`.

Modelo: `qwen2.5-coder:7b`, 4 683 087 561 bytes, digest `dae161e27b0e90dd1856c8bb3209201fd6736d8eb66298e75ed87571486f4364`. Ollama confirmó 100 % GPU y contexto de 4096 en la laptop probada. El modelo declara capacidad máxima de 32768, que no es una promesa de rendimiento con ese tamaño.

El primer `doctor --probe` local completó una solicitud: 58,37 segundos de extremo a extremo, 30,10 segundos de carga informados por el motor y dos tokens de salida. Una carga inicial incluye trabajo adicional; estos datos no describen todas las solicitudes posteriores.

La comparación sintética aplica los mismos mensajes y máximo de salida de 512 a ambos motores, dos repeticiones (seis solicitudes por motor). La duración del informe incluye preparación del cliente; las métricas de cada stream distinguen tiempos reportados por el motor. Las diferencias de tokenización y razonamiento de los modelos impiden comparar sus contadores como si fueran equivalentes.

Resultados detallados: [mini-suite](evidence/local-comparison-5.7.json). No demuestra calidad general de programación ni capacidad para cinco usuarios simultáneos.

En la comparación final ambos motores aprobaron 6/6. Promedios observados: 1,39 s local y 4,69 s nube. Los dos modelos produjeron cantidades de tokens diferentes; son tiempos de estas tareas concretas y no una clasificación general de rendimiento.

## Cambio de código con aceptación independiente

En dos proyectos temporales con las mismas fuentes y pruebas iniciales, Ollama y OpenRouter generaron un cambio de normalización de títulos. Se revisaron ambos diffs: exclusivamente `src/domain/title.js`, sin imports ni operaciones externas. Se aplicaron a sus copias de prueba, se ejecutaron las pruebas del proyecto y seis aserciones independientes: espacios/tabs/saltos, normalización antes del máximo, límite 120, rechazo 121, tipo inválido y vacío. Ambos pasaron y se restauraron los bytes originales.

La preparación de la propuesta local tomó 15,57 s y la de nube 22,62 s en esa ejecución. Una muestra por motor no permite afirmar cuál es más rápido en general. [Informe de aceptación](evidence/local-engineering-5.7.json).

## Límites de la evidencia

No se han probado físicamente las otras cuatro computadoras ni las Macs. No hay servidor compartido configurado, medición de cinco usuarios concurrentes, entrenamiento de un modelo propio ni garantía universal de ajuste a memoria. La nube conserva sus errores de cuota, permisos y disponibilidad. Las métricas no calculan saldo restante ni facturación sin datos del proveedor.
