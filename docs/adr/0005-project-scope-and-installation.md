# ADR 0005: proyecto explícito e instalación independiente

Estado: aceptada. Fecha: 2026-10-31.

## Problema

Cada comando requería repetir rutas. Al cambiar de carpeta era posible continuar una conversación de otro proyecto. El comando global creado con un enlace dependía de conservar el checkout.

## Decisión

Presentación resuelve una raíz canónica con `--project` o `/open`, aplica los valores por defecto y restaura el directorio del proceso al cerrar. El agregado conserva una identidad opcional de proyecto y rechaza su cambio antes de llamar al modelo. No se incorporan APIs de archivos al dominio. Cambiar de raíz inicia otra conversación.

Se conserva el esquema SQLite 3 y la compatibilidad de sesiones sin proyecto. La identidad no cambia silenciosamente al mover una carpeta; una futura operación de reubicación deberá ser explícita.

La distribución global instala un tarball compilado, no un enlace al código fuente. `npm-shrinkwrap.json` fija dependencias de ejecución y el instalador comprueba hash, versión y copia independiente. Una instalación temporal en CI verifica el artefacto, sus dependencias y un flujo de proyecto.

## Consecuencias

Las rutas relativas siguen el proyecto activo. Las opciones de ruta explícitas mantienen su prioridad. Abrir un proyecto carga su configuración según la precedencia existente. Las consultas con proyecto activo adjuntan sus fuentes seleccionadas salvo desactivar o reemplazar el contexto.

El tarball requiere registro npm o caché para instalar dependencias; el ZIP portable conserva su runtime incluido. Mover el checkout no actualiza ni rompe la copia global. Actualizar exige volver a instalar una versión explícita.
