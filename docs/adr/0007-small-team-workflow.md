# ADR 0007: colaboración de un equipo pequeño mediante Git

Estado: aceptada. Fecha: 2026-10-31.

## Contexto

ARES se utiliza por Kevin y cuatro desarrolladores más. Necesitan acuerdos reproducibles y una forma de revisar cambios entre clones, conservando sus credenciales e historiales personales.

## Decisión

ares.team.json es un archivo versionado con nombre, scripts acordados y una recomendación opcional de proveedor/modelo. Su esquema rechaza campos desconocidos y credenciales. Se consulta como configuración local; no ejecuta scripts al abrir. team check prevalida todos los scripts y ejecuta los acordados explícitamente, con evidencia individual, timeout, cancelación y detención tras un fallo. La CI utiliza el mismo comando.

Las preferencias personales por proyecto tienen prioridad sobre la recomendación compartida. Flags, entorno y .env del proyecto conservan sus prioridades. Las claves, alias e historial siguen en el directorio privado de cada desarrollador.

## Protocolo de propuestas

Un paquete ares-change v1 comparte resumen, fecha, rutas relativas, hashes de partida y contenido resultante. Omite raíz local, instrucciones originales, copias, IDs locales y evidencias de verificación. Sus límites son 24 archivos y 800000 caracteres de contenido, con lectura UTF-8 acotada. Los hashes y contenido de intercambio normalizan CRLF a LF. La importación preserva el estilo LF/CRLF de archivos existentes.

La huella SHA-256 corresponde a una serialización canónica. Acredita integridad del contenido, no identidad, firma o aprobación de una persona. La procedencia y revisión se gestionan en GitHub. Los detectores de secretos y las exclusiones de rutas reducen exposición, sin constituir una clasificación universal de datos.

Importar valida el paquete y los hashes de partida antes de crear una propuesta nueva en la copia receptora. No modifica archivos. El flujo existente diff/apply/verify/restore mantiene su preflight y recuperación. La evidencia de otro equipo no se copia como prueba local.

## Consecuencias

Los cinco desarrolladores pueden trabajar en clones independientes sin compartir SQLite o claves. Git y las PR conservan integración y revisión. Las propuestas no fusionan cambios divergentes automáticamente: se actualiza el clon o se genera otra propuesta sobre la nueva base.

No cambia el esquema SQLite 4 ni se requiere un servicio de colaboración. Los scripts compartidos son de package.json; otros lenguajes requieren comandos explícitos del proyecto y sus SDKs instalados.
