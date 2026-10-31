# ARES Web y avatar voxel

La web es otro punto de entrada al ecosistema. La CLI 5.7.1 continúa independiente; backend y frontend web pasan a 4.6.0.

## Abrir y conectar

1. Abre [ARES Web en Render](https://ares-frontend-y8e6.onrender.com).
2. Pulsa **Configurar acceso**. Introduce la **ARES_API_KEY** que figura en el entorno del backend de Render. Es una clave de acceso al servidor, distinta de las claves de IA.
3. Pulsa **Guardar y conectar**. La web comprueba `/health` y el catálogo protegido `/api/models`; después habilita la conversación y permite elegir un modelo.

La clave queda en la sesión del navegador por defecto. **Recordar en este navegador** permite conservarla entre sesiones: úsalo solo en un equipo de confianza. No se incluye una clave de acceso ni claves de proveedores en el JavaScript publicado. El backend usa Gemini y OpenRouter; el catálogo del CLI con cinco proveedores y Ollama no está integrado en esta API web.

El servidor del plan gratuito puede necesitar tiempo para arrancar. La interfaz muestra **Iniciando servidor…** si la comprobación tarda y espera hasta un minuto. El indicador confirma acceso HTTP a la API; una inferencia real también depende de la configuración, disponibilidad y límites del proveedor elegido.

## Tu avatar

- El modelo articulado utiliza geometría de Three.js, con la silueta del diseño aportado: cabeza de monitor, cresta, armadura azul/cian, espada, escudo y capa de código.
- Las 16 poses se traducen desde la máquina de estados existente mediante un adaptador de dominio. No hay un segundo catálogo de estados.
- Los controles permiten girar y restablecer la cámara. El selector de poses es una vista previa y no ejecuta tareas.
- **Vista ligera** usa las imágenes originales de cada pose. Se activa automáticamente si WebGL no está disponible o se pierde el contexto.
- **Pausar** detiene el bucle de animación. La preferencia del sistema de movimiento reducido tiene prioridad. El renderizado se limita a 30 FPS y se suspende cuando el avatar no está visible o la pestaña está oculta.
- En móvil, el avatar se abre con **Ver a ARES**. No se crea un canvas mientras ese panel está cerrado.
- El enlace de descarga del pie entrega el **GLB estático**. Las animaciones del componente articulado no son clips incluidos en ese archivo.

Origen: ZIP `ARES-Avatar-3D-Visuales-2026-10-31.zip` y las dos referencias aportadas por Kevin. Se comprobaron las 41 huellas de su manifiesto antes de integrar los recursos. Los módulos `model.ts`, `scene.ts` y `effects.ts` proceden de esa entrega y se adaptaron al ciclo de vida de Vue.

## Conversación y herramientas

Las tarjetas iniciales preparan un borrador: no gastan una llamada de IA. Enter envía; Shift + Enter inserta una línea. Un borrador se conserva si antes necesitas conectar el servidor. **Detener** cancela la solicitud del navegador; el proveedor puede haber consumido tokens antes de recibir la cancelación.

Una respuesta solo se considera terminada cuando llega su evento SSE `done`. Si la conexión se corta, la interfaz conserva el texto parcial y lo marca como incompleto. No repite la solicitud automáticamente.

El menú de herramientas conserva los módulos de revisión, forja, memoria, arquitectura, especialistas, bienestar y laboratorio. Las simulaciones se señalan como tales. Los recordatorios de bienestar no son mediciones físicas. La terminal del panel es la terminal web histórica: no ejecuta el CMD local ni sustituye a la CLI instalada.

El dictado depende del navegador y de su permiso de micrófono; la reproducción de voz depende de las voces del sistema. No se ha verificado un micrófono físico ni un dispositivo móvil real en esta entrega.

## Equipo y datos

La clave compartida permite acceder al mismo servidor y su historial; todavía no hay cuentas individuales, roles ni separación de conversaciones por persona. El piloto de cinco personas sigue pendiente de la prueba humana.

El backend actual usa SQLite sin disco persistente en Render gratuito. **Un redeploy puede borrar conversaciones y memoria**. Exporta las conversaciones que necesites conservar desde el menú de herramientas. La configuración compartida y los intercambios de la CLI siguen en Git/archivos locales y no dependen de ese SQLite web. Esta entrega no crea recursos de pago ni instala un servidor de modelos en los equipos del grupo.

## Ejecutar en desarrollo

Desde una copia actual del repositorio, en CMD:

```bat
npm --prefix backend ci
if not exist backend\.env copy backend\.env.example backend\.env
```

Configura el archivo `backend\.env` localmente con una clave de acceso ARES y un proveedor. Después abre dos terminales en la raíz:

```bat
cd backend
npm run dev
```

```bat
cd frontend
npm ci
npm run dev
```

Abre `http://localhost:5173`. Vite envía `/api` y `/health` al backend en `localhost:3000`. La variable de proceso `ARES_DEV_API_URL` permite elegir otro backend para desarrollo. Para builds estáticos con un backend externo se usa `VITE_API_URL`; nunca una clave dentro de variables `VITE_*`.

## Render y el fallo de CORS

El contenedor anterior compilaba, pero el arranque rechazaba `CORS_ORIGIN=*` en producción. Render mantuvo la versión anterior mientras marcaba el deploy nuevo como fallido.

Se corrigió el entorno del backend con esta lista, sin modificar las credenciales:

```env
CORS_ORIGIN=https://ares-frontend-y8e6.onrender.com,https://ai-innovation-op.github.io
```

Se usan orígenes completos, sin ruta `/ARES` ni barra final. Las nuevas pruebas también rechazan una lista como `https://example.com,*`. Una configuración inválida falla antes de aceptar tráfico. La guía original de la web se conserva en [legacy-web-v4.md](legacy-web-v4.md).

## Comprobar esta entrega

```bat
npm --prefix backend test
npm --prefix backend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
cd frontend
npx playwright install chromium
npm run test:e2e
```

En Linux CI, Playwright instala Chromium con `--with-deps`. Las pruebas de interfaz usan respuestas sintéticas e interceptan las peticiones API: no son una evaluación de calidad ni una inferencia real de los proveedores.

Se verifican las 16 poses, matrices finitas, geometrías compartidas, liberación de recursos, UTF-8 fragmentado, SSE cortado, cancelación, acceso por sesión, foco y Escape, pérdida de WebGL, pausa y tamaños de 375, 768, 1024 y 1440 píxeles. Las capturas de Chromium con renderizador por software verifican la composición; el rendimiento de GPU real y los Mac del equipo requieren el piloto.
