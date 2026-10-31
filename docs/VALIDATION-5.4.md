# Validación de ARES CLI 5.4

Fecha local: 2026-10-31, America/Lima. Windows, Node.js 24.21.0.

## Verificación local

- Formato, tipos, compilación y **84 pruebas aprobadas**, sin fallos ni omitidas.
- Análisis de 34 módulos sin infracciones, ciclos, parseos inválidos o imports sin resolver.
- Rutas con espacios, selección de proyecto, aplicación/restauración en la carpeta elegida y conservación de archivos de la carpeta desde la que se lanzó ARES.
- Rechazo de aplicar, restaurar o verificar una propuesta desde otro proyecto activo, conservando sus archivos.
- Contexto en solicitudes HTTP reales a un servidor de pruebas; sesiones vinculadas y rechazo de otra carpeta antes de generar una petición.
- Apertura fallida sin cambiar el proyecto anterior, selección correcta del modelo del proyecto y reinicio de conversación al abrir/cerrar carpetas.
- Tarball instalado en prefijo temporal como copia regular: versión, dependencias directas frente al lockfile, diagnóstico, proyecto generado y verificación real aprobados.

## Tarea real de programación

Se creó un proyecto aislado con una función de dominio para validar títulos y tres tests previos. ARES usó el proveedor configurado para generar una propuesta que colapsa espacios, tabulaciones y saltos de línea, conservando las invariantes existentes.

La propuesta no escribió archivos. Se revisó su diff y solo afectaba a los dos archivos autorizados. El resumen del modelo atribuía a un test una corrección no observada; se evaluó el código del diff en lugar de tomar ese resumen como evidencia.

Después de aplicar, se ejecutaron los tests y una aceptación independiente que no podía modificar la IA: normalización, tildes, 200 espacios internos, título vacío, longitud máxima y entrada no textual. La restauración recuperó los bytes originales de ambos archivos.

Es una prueba acotada con un proveedor real y una tarea concreta, no una tasa general de éxito ni una medición de cobertura.

## Entrega y límites

El paquete npm contiene código compilado y `npm-shrinkwrap.json`; la instalación global crea una copia que no apunta al checkout. El portable sigue incluyendo dependencias de ejecución. La CI comprueba ambos en instalaciones aisladas con Node 24, además de las pruebas CLI en Windows/Ubuntu con Node 24/26.

Las conversaciones guardan una ruta canónica opcional sin migrar el esquema SQLite. Las anteriores quedan sin proyecto; reubicar una carpeta requiere una sesión nueva hasta implementar una vinculación explícita. `--project` determina los valores por defecto; los argumentos de ruta explícitos siguen siendo decisiones del usuario.

El instalador usa [el lockfile publicable recomendado para herramientas CLI](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json/). Las claves del usuario permanecen fuera de los artefactos.
