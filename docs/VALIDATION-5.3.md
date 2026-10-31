# Validación de ARES CLI 5.3

Fecha local: 2026-10-31, America/Lima. Node.js 24.21.0 en Windows.

## Pruebas locales

- Formato, tipos, compilación y **79 pruebas aprobadas**, sin fallos ni omitidas.
- Análisis de 34 módulos sin infracciones, ciclos, errores de parseo o imports sin resolver.
- Cada proveedor selecciona su clave, modelo y endpoint; un cambio no reutiliza el modelo o URL de otro perfil. Precedencia de proceso/proyecto/personal y conservación de modelos anteriores verificadas.
- Transporte con endpoints y headers controlados, paginación nativa de Cohere, normalización de IDs de Gemini y rechazo de tokens de página repetidos.
- Redacción de varias credenciales, incluyendo claves con prefijos comunes y cada frontera de chunks. Los tests usan únicamente valores ficticios.
- Selección de proveedor dentro del REPL y conservación de estado al limpiar la pantalla.

## Comprobaciones externas

Con credenciales locales privadas se completaron autenticación y catálogos de los cinco proveedores. Gemini, OpenRouter, Groq y Cohere completaron una respuesta mínima a través del CLI real, incluyendo configuración, streaming y persistencia temporal. La salida se comprobó para evitar valores de credenciales.

Mistral permitió consultar modelos, pero devolvió HTTP 429 en la prueba de generación y su reintento posterior. Ese resultado acredita un rechazo por límites del servicio en esa cuenta, no una respuesta de IA completada. No se cambiaron planes, cuotas ni servicios automáticamente.

Las claves se mantuvieron fuera del repositorio. La configuración privada usada en Windows quedó limitada mediante ACL a su usuario y SYSTEM, con herencia bloqueada en el directorio. El archivo es texto legible; no se presenta como una bóveda cifrada. Los artefactos y el diff se revisan para excluir credenciales.

## Referencias de integración

- [Mistral: chat y streaming](https://docs.mistral.ai/api/endpoint/chat).
- [Groq: compatibilidad de chat](https://console.groq.com/docs/openai).
- [Cohere: API de compatibilidad](https://docs.cohere.com/docs/compatibility-api).
- [Cohere: catálogo paginado](https://docs.cohere.com/v2/reference/list-models).

La matriz de CI usa fixtures locales, sin claves comerciales, en Windows/Ubuntu con Node 24/26. Las comprobaciones vivas son puntuales y no garantizan disponibilidad o cuota futura de una cuenta.
