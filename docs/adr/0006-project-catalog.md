# ADR 0006: identidad y perfiles persistentes de proyecto

Estado: aceptada. Fecha: 2026-10-31.

## Problema

Una ruta canónica permite separar conversaciones, pero cambia al mover una carpeta. Repetir rutas y preferencias de IA tampoco resulta práctico al alternar entre proyectos.

## Decisión

El agregado Project conserva un ID estable, alias único, ubicación, revisión y preferencias opcionales de proveedor/modelo. El dominio recibe identidades opacas; no importa Node ni consulta archivos. El caso de uso ManageProjects utiliza un puerto de persistencia y recibe ubicaciones ya validadas por presentación.

El esquema SQLite 4 añade el catálogo. La migración de esquemas 1/2/3 crea antes una copia consistente con VACUUM INTO. Registrar una carpeta vincula sus conversaciones anteriores en una transacción y mantiene turnos, fechas, revisión e índice FTS. Un trigger impide perder una identidad ya asignada por una escritura antigua; otro vincula inserciones concurrentes que todavía solo conocen la ruta.

La reubicación es una operación explícita de registro, no un movimiento de archivos. La carpeta de destino debe existir y no pertenecer a otro proyecto. Se rechaza mientras la carpeta original siga presente con su identidad. Cuando el sistema de archivos expone dev/ino, se guarda una huella para detectar que otra carpeta sustituyó la ubicación registrada. No se trata de una huella de contenido ni protege contra cambios de archivos dentro de la misma carpeta.

Las sesiones registradas comparan el ID estable antes de contactar al modelo. Las propuestas y verificaciones conservan su raíz y evidencia originales; la reubicación no las aplica ni restaura en otro destino.

## Configuración

Precedencia: flags/interacción, proceso, .env del proyecto, preferencias registradas y .env personal. Las preferencias guardan solo proveedor y modelo; las claves siguen en la configuración privada. Un modelo general y una URL conservan el proveedor de su fuente para impedir que una preferencia reutilice los de otro proveedor.

La ubicación privada se fija al iniciar ARES, incluso si ARES_HOME o ARES_ENV_FILE eran relativos. La selección de carpetas no traslada las claves o la base.

## Consecuencias

Las sesiones anteriores sin proyecto siguen disponibles. Las vinculadas a una ruta pasan a una identidad estable al registrar esa carpeta. Se puede reutilizar la ubicación anterior para otro proyecto después de reubicar el primero, sin confundir sus sesiones. Las versiones antiguas no deben abrir el esquema 4; para volver atrás se usa la copia previa con las terminales cerradas.
