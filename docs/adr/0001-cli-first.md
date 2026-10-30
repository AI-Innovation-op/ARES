# ADR 0001: CLI independiente y monolito modular

Fecha: 2026-10-30. Estado: aceptado.

## Contexto

La prioridad del producto es funcionar en CMD. La versión 4.5.1 tenía una CLI que requería Express en localhost y mezclaba presentación, HTTP, escritura y shell. Algunos errores devolvían código cero. La documentación también presentaba simulaciones de benchmarks como resultados.

## Decisión

Reconstruir `cli/` como aplicación independiente sobre Node.js 24, manteniendo TypeScript. Usar DDD en conversaciones y propuestas, puertos de aplicación y adaptadores HTTP/SQLite/archivos. Hacer de la terminal la interfaz principal del repositorio. Conservar backend, web y MCP como aplicaciones históricas sin integrarlas de forma implícita.

## Alternativas

- Adaptar el cliente HTTP existente: conserva el servidor como requisito y no resuelve el problema principal.
- Recrear todos los componentes: multiplica el alcance y elimina capacidades históricas sin necesidad.
- Introducir un framework de agentes y despliegue cloud: añade servicios y dependencias antes de justificar su utilidad para una herramienta local.

## Consecuencias

La CLI funciona sin web, Docker, Redis o PostgreSQL. SQLite nativo evita compilación de drivers. La IA exige configuración explícita de proveedor y modelo. El núcleo no promete voz, benchmarks, ejecución autónoma o un enjambre que esta CLI no implementa. Se requieren tests y builds propios, incluidos CMD y manejo de rutas con espacios.
