# ADR 0003: Evidencia de ejecución explícita y vinculada al código

Fecha: 2026-10-30. Estado: aceptado.

## Contexto

Generar tests y ejecutarlos son operaciones distintas. Un resultado positivo de ayer tampoco demuestra que los archivos actuales sean correctos. ARES necesita mostrar resultados reales sin dar a un modelo permiso implícito para ejecutar comandos.

## Decisión

Añadir un contexto de verificación con un puerto ProjectChecks. El usuario elige un script existente del proyecto; el adaptador usa `node --run`, sin instalar dependencias ni ejecutar hooks pre/post automáticamente. Registrar la ejecución como evidencia inmutable con huella de fuentes, revisión de propuesta, salida limitada, código del ejecutor y tiempo medido.

Comparar las fuentes antes y después. Si cambian, marcar `stale`; al consultar un registro histórico, mostrar su correspondencia actual por separado. Timeout y cancelación terminan el árbol iniciado. Las credenciales conocidas del entorno y patrones comunes se redactan de los registros.

## Consecuencias

El usuario puede verificar una propuesta aplicada o un proyecto independiente. Un fallo no se convierte en éxito mediante texto generado. La ejecución requiere confiar en el script del proyecto y usa los permisos del usuario; no es un sandbox. La huella tiene límites de lectura y no incluye todas las dependencias o archivos privados. El esquema SQLite se migra de forma transaccional conservando los datos anteriores.
