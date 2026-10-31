# Trabajar en ARES en un equipo de cinco

Cada desarrollador trabaja en su propio clon y conserva su configuración en su carpeta personal de ARES. El repositorio comparte código, acuerdos y revisiones mediante Git.

## Preparación

1. Instala Node.js 24 o superior y la misma release de ARES que use el equipo.
2. Clona el repositorio y ejecuta `npm run setup`.
3. Configura tus proveedores con `ares.cmd setup`. Las claves y la base SQLite permanecen en tu equipo; no copies la carpeta `.ares` de otra persona.
4. Comprueba los acuerdos con `ares.cmd team show` desde la raíz y ejecuta `ares.cmd team check`.

`ares.team.json` es la configuración compartida. Sus scripts se ejecutan solo al pedir `team check`; abrir el proyecto no los ejecuta. Revisa los scripts de proyectos recibidos antes de ejecutarlos.

## Una tarea, una rama y una revisión

Trabaja en una rama de tu clon. Describe el comportamiento requerido y limita el cambio a esa tarea. Conserva el dominio independiente de Node y frameworks, y usa puertos para sus dependencias.

Revisa las propuestas con `diff`, aplícalas explícitamente y ejecuta las comprobaciones. Incluye en la PR el cambio de comportamiento, los comandos ejecutados y sus resultados. Otro integrante puede revisar el diff y repetir las comprobaciones en su clon. La revisión y la identidad de las personas se gestionan en GitHub.

Antes de integrar, actualiza la rama con el trabajo del equipo y resuelve los conflictos. Los hashes de ARES no sustituyen este flujo de Git. Evita que varias personas modifiquen una misma carpeta de trabajo compartida.

## Intercambiar una propuesta

El autor exporta una propuesta pendiente o aplicada que todavía coincide con sus archivos:

```cmd
ares.cmd handoff export ID_LOCAL -o cambio.ares-change.json
```

El compañero inspecciona el archivo y lo importa en su propio clon:

```cmd
ares.cmd handoff inspect "D:\revisiones\cambio.ares-change.json"
ares.cmd --project "D:\mi-clon" handoff import "D:\revisiones\cambio.ares-change.json"
ares.cmd diff NUEVO_ID
ares.cmd apply NUEVO_ID
ares.cmd verify NUEVO_ID
ares.cmd --project "D:\mi-clon" team check
```

Importar crea una propuesta local y conserva los archivos. La aplicación requiere que sigan coincidiendo sus hashes. Si el clon ya cambió respecto al punto de partida, la importación se detiene; actualiza o vuelve a generar la propuesta en lugar de sobrescribir el trabajo del compañero.

El paquete comparte resumen y contenido completo de los archivos modificados, con rutas relativas. Omite la raíz local, el historial, las copias y los resultados de verificación. Los saltos de línea se normalizan para el intercambio y los archivos existentes conservan LF o CRLF al importar.

La huella SHA-256 comprueba integridad; no es una firma ni acredita autoría. Confirma la procedencia mediante la PR y revisa el contenido. La detección de posibles secretos es heurística: trata el paquete como código del proyecto y compártelo por los canales autorizados del equipo.

## Preferencias y comprobaciones

Cada persona puede guardar sus alias y preferencias mediante `projects`. El bloque `ai` opcional de `ares.team.json` recomienda proveedor/modelo sin contener claves. Las preferencias personales del proyecto, su `.env`, el entorno y los flags tienen prioridad.

Las comprobaciones compartidas son nombres de scripts de `package.json`, hasta ocho. Puedes incluir comandos de otros lenguajes en scripts explícitos si sus herramientas están instaladas; ARES registra el resultado del proceso. No se instalan dependencias ni SDKs del proyecto automáticamente.
