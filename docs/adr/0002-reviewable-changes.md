# ADR 0002: Separar generación, revisión, aplicación y restauración

Fecha: 2026-10-30. Estado: aceptado.

## Contexto

Una respuesta del modelo puede contener rutas inseguras o cambios fuera de alcance. El éxito de tests generados no prueba que el cambio sea correcto. El usuario necesita conservar sus ediciones y poder inspeccionar el resultado antes de aplicarlo.

## Decisión

Representar cada conjunto de cambios como un agregado Proposal, persistido y asociado a hashes de una instantánea. `propose` no toca el proyecto. `diff` hace el resultado revisable. `apply` es una acción explícita con validación completa previa y copias durables. `restore` recupera el contenido original y se detiene ante ediciones posteriores. Permitir importar el mismo formato JSON sin proveedor.

## Alternativas

- Sobrescribir el archivo desde `audit --write`: no permite revisar el conjunto ni comprobar divergencias.
- Usar exclusivamente Git: es excelente para revisión, pero requiere un repositorio y no conserva de forma independiente originales sin commit.
- Ejecutar una shell escrita por el modelo: amplía las acciones más allá de un conjunto de archivos revisable y no es necesario para el flujo inicial.

## Consecuencias

Se conserva control explícito sobre las escrituras. El sistema puede recuperarse de interrupciones y rechaza aplicar dos veces la misma propuesta. No existe atomicidad multiarchivo frente a procesos externos. Las copias contienen código local y requieren proteger `ARES_HOME`. Revisar el alcance sigue siendo responsabilidad del usuario; no se confunde una propuesta con una modificación ejecutada.
