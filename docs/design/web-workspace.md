# Decisiones visuales de ARES Web

## Dirección

Un espacio de ingeniería para Kevin y su equipo: conversación como actividad principal, compañero voxel visible sin competir con el trabajo y herramientas a una acción de distancia. Se conserva el personaje azul, cian y verde del material aportado y la firma AI Innovation.

Se aplicó la skill UI/UX Pro Max para revisar contraste, foco, interacción, composición adaptable y rendimiento. La dirección concreta se eligió a partir de las referencias del proyecto; no se adoptó la paleta púrpura ni la estructura de landing que sugería la búsqueda genérica.

## Tokens

| Uso                | Valor                      |
| ------------------ | -------------------------- |
| Fondo              | `#08141c`                  |
| Panel              | `#0b1b24`                  |
| Superficie elevada | `#10232c`                  |
| Borde              | `#223943`                  |
| Texto principal    | `#edf5f5`                  |
| Texto secundario   | `#9ab0b9`                  |
| Acento             | `#65e6bd`                  |
| Cian de apoyo      | `#70cce2`                  |
| Radio base         | `12px`                     |
| Texto              | Inter / system-ui          |
| Marca              | Orbitron                   |
| Metadatos          | JetBrains Mono / monospace |

La definición ejecutable está en `frontend/src/assets/workspace.css`. Los espacios se apoyan en múltiplos de 4 y 8; los paneles se diferencian por superficie y borde, con brillo reservado para el avatar y los estados.

## Composición e interacción

- Escritorio: encabezado, panel lateral de avatar y conversación flexible. El compositor permanece visible y el contenido tiene su propio desplazamiento.
- Hasta 820 px: una columna; el avatar se abre bajo demanda para dejar espacio al texto y evitar un canvas oculto.
- Hasta 520 px: tarjetas iniciales en filas, etiquetas y acciones compactas, selección de modelo dentro de la configuración.
- Una acción principal: enviar. Las tarjetas preparan un borrador y los módulos se descubren desde un menú explícito.
- Iconos SVG con el mismo trazo; las acciones sin texto tienen nombre accesible. Foco visible, Escape y foco contenido mediante diálogos nativos.
- Controles táctiles de al menos 44 px en móvil; campos a 16 px para evitar zoom del navegador al escribir.
- El estado de conexión refleja comprobaciones de HTTP y autenticación. Una animación no demuestra que el servidor o la IA estén funcionando.

## Movimiento y coste de renderizado

La preferencia del sistema puede desactivar el movimiento. El usuario también puede pausarlo o elegir imágenes. La escena se limita a 30 FPS y se detiene cuando deja de ser visible. Los recursos se liberan al desmontarse; una pérdida de WebGL activa la pose PNG correspondiente. Los diagramas y herramientas se cargan bajo demanda.

## Revisión

Los flujos de navegador cubren 375, 768, 1024 y 1440 px, sin desbordamiento horizontal. Se verifican teclado, diálogos, estados de conexión, borradores, cancelación, poses y pérdida del contexto WebGL. Quedan fuera de esta evidencia los micrófonos físicos, los Mac del equipo y la evaluación humana del piloto.
