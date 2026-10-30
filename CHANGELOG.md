# CHANGELOG: A.R.E.S. Ecosystem

Todos los cambios notables en este proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/) y adherido a [Semantic Versioning](https://semver.org/).

---

## [4.5.0] - 2026-10-30

### 🛡️ Consolidación Soberana & Remediación Integral de Seguridad, Fiabilidad, Despliegue y CI

- **Fase 1 (Seguridad Crítica - v4.1.0):**
  - **Mitigación de Path Traversal & Inyección:** Creado módulo `backend/src/utils/validacion.ts` con funciones de validación estricta (`resolverRutaSegura`, `validarNombreRama`, `validarRemoteUrl`, `validarTokenGithub`, `validarAutorGit`, `validarMensajeCommit`).
  - **Blindaje del Autómata Git:** Normalización de comandos en `backend/src/services/git-automator.service.ts` con `git add -- <ruta>` y máscara `***` en tokens de autenticación para logs y trazas de error.
  - **Autenticación y Control de Acceso:** Middleware de autenticación de tiempo constante (`crypto.timingSafeEqual`) con cabecera `x-api-key` y variable obligatoria en producción `ARES_API_KEY`.
  - **Hardening de Cabeceras HTTP:** Implementación de `helmet`, CORS con lista blanca configurable (`CORS_ORIGIN`), y limitación de tasa `express-rate-limit` (120 req/min general, 15 req/min para inferencia de IA).
  - **Aislamiento del Frontend:** Retiro de `allow-same-origin` en sandboxes de iframes (`ChatMessage.vue`, `LivePreviewModal.vue`), filtrado de mensajes exclusivos para el iframe anfitrión, Mermaid en modo `securityLevel: 'strict'` y saneamiento de rutas ZIP en `zip.service.ts`.
  - **CLI Blindada:** Creación de `cli/src/http.ts` con `apiFetch` inyectando `x-api-key` y `cli/src/ruta-segura.ts` para confinamiento estricto de directorios de extracción.

- **Fase 2 (Fiabilidad Multiplataforma - v4.2.0):**
  - **Conmutación Inteligente de Base de Datos:** `backend/src/utils/errores-db.ts` restringe el failover hacia SQLite únicamente ante fallos genuinos de conectividad de red/Postgres (`ECONNREFUSED`, `ENOTFOUND`, `57P01`-`57P03`, `08xxx`), propagando correctamente los errores de SQL y constraints.
  - **Cliente Lazy de Gemini:** Instanciación bajo demanda de `GoogleGenAI` en `backend/src/services/gemini.service.ts` permitiendo operar exclusivamente con `OPENROUTER_API_KEY` y arrojando HTTP 503 explicativo si se invoca sin clave.
  - **Hook Pre-Push Tolerante a Node 20:** Carga dinámica (`await import('node:sqlite')`) en `hooks/pre-push.js` para prevenir fallos fatales `ERR_UNKNOWN_BUILTIN_MODULE` en entornos Node < 22.5.
  - **Eliminación Total de Rutas Fijas:** Erradicación de rutas hardcodeadas `D:/ares-ecosystem` en `changelog.service.ts`, `test-regression-*.mjs`, `hooks/pre-push.js` y `mcp/src/index.ts`.
  - **Actualización MCP:** Dependencias de `@modelcontextprotocol/sdk` (^1.32.2) y `zod` (^4.6.7) actualizadas, resolviendo vulnerabilidades reportadas por `npm audit`.
  - **Documentación Alineada:** README maestro y de MCP actualizados con requerimientos exactos de Node (≥22.13), Three.js (0.172) y tabla de configuración de seguridad.

- **Fase 3 (Despliegue Soberano - v4.3.0):**
  - **Docker Seguro:** Contenedor de backend ejecutándose bajo usuario no privilegiado `node`, con paquete `git` preinstalado para el Autómata Git y `HEALTHCHECK` activo vía `wget`.
  - **Frontend Nginx Dinámico:** Conversión de configuración Nginx a plantilla `nginx.conf.template` con sustitución de variables `${BACKEND_URL}` y `${BACKEND_HOST}` al arranque mediante `envsubst`.
  - **Docker Compose Blindado:** Confinamiento de puertos de Postgres, Redis y Backend a la interfaz local `127.0.0.1`, volumen nombrado persistente `ares_data` con permisos heredados y validación estricta de `ARES_API_KEY`.
  - **Blueprint de Render:** Generación automática de `ARES_API_KEY`, variable `CORS_ORIGIN` interactiva, `TRUST_PROXY_HOPS=2` y bloque `disk` documentado.
  - **GitHub Pages:** Integración de variable `VITE_API_URL: ${{ vars.ARES_API_URL }}` y pinning de GitHub Actions por SHA inmutable en `deploy-pages.yml`.

- **Fase 4 (Calidad & CI - v4.4.0):**
  - **Workflow de CI Completo:** `.github/workflows/ci.yml` con tres jobs paralelos (`backend`, `frontend`, `cli-y-mcp`) cubriendo typecheck, tests, auditoría y compilación.
  - **Sentinel PR Auditor Reparado:** Arreglado script en `.github/workflows/ares-sentinel.yml` con `await` en publicación de comentarios, diff de tres puntos (`...HEAD`), y ejecución segura `execFileSync`.
  - **Dependabot:** Monitoreo semanal de actualizaciones de seguridad en `.github/dependabot.yml` para los 4 paquetes npm y GitHub Actions.
  - **Suite de Regresión 16/16:** Verificación completa de todos los subsistemas funcionales con 100% de éxito.

---

## [4.0.0] - 2026-10-27

### 🚀 Lanzamiento Oficial (Official Release)
- **Banner Cibernético ASCII Rediseñado (Tipografía Simétrica de Bloques):**
  - Corrección milimétrica de las siglas `A R E S`: rediseño de la letra 'R' (eliminando la confusión visual con 'A') y alineación perfecta de las letras 'E' y 'S'.
  - Atribución de autoría oficial: `Created by AI Innovation`.
  - Estética minimalista y sobria de terminal: eliminación de corchetes `[]` y referencias residuales.
- **Asistente Interactivo de Forja DDD (`ares forge` / `ares new` / `wizard.ts`):**
  - Detección y lectura instantánea de texto en el portapapeles de Windows (`Ctrl+C` desde PDFs de enunciados).
  - Asistente guiado paso a paso: Enunciado ➔ Bounded Contexts ➔ Stack Tecnológico ➔ Matriz de Equipo ➔ Destino & ZIP ➔ Commits Atómicos Git ➔ Push a GitHub.
  - Distribución de contextos entre compañeros del Squad firmando cada commit con el `--author` del integrante para iluminar sus cuadros verdes en GitHub.
- **Empaquetado y Descarga Directa en .ZIP en Disco C: o D: (`ares zip`):**
  - Comando standalone `ares zip <directorio> [archivo.zip]` que genera paquetes comprimidos en cualquier ruta local indicada por el usuario en segundos.
  - Generación de `.zip` dual automática durante la forja de proyectos.
- **Preparación para Despliegue en GitHub Pages:**
  - Configuración de rutas relativas `base: './'` en `vite.config.ts` para servir la interfaz web en cualquier subdominio o carpeta.
  - Workflow de CI/CD automatizado en `.github/workflows/deploy-pages.yml` para publicar la consola táctica en vivo en GitHub Pages.
- **Sincronización Total Monorepo v4.0.0:**
  - Actualización a versión `4.0.0` en `@ares-ecosystem/backend`, `@ares-ecosystem/frontend`, `@ares-ecosystem/cli` y `@ares-ecosystem/mcp`.
  - Instaladores de Windows `install.bat` y `install.ps1` sincronizados con el release 4.0.

---

## [3.9.0] - 2026-10-27

### 🤖 Nuevas Funcionalidades (Features)
- **Cambio de IA Automática (Enrutador Adaptativo & Conmutador Failover Resiliente - `AiRouterService`):**
  - **Enrutamiento Inteligente Basado en Intención Táctica:**
    - `REASONING_DDD`: Enruta consultas de modelado Domain-Driven Design, Bounded Contexts, Value Objects, mutación Stryker y análisis de complejidad Big-O a **DeepSeek R1** (`deepseek/deepseek-r1`) con cadena reflexiva de pensamiento.
    - `CODE_GEN`: Enruta generación masiva de código TypeScript, componentes Vue 3, refactorización y arquitectura limpia a **DeepSeek V3** (`deepseek/deepseek-chat`).
    - `VISION_MULTIMODAL`: Enruta capturas de pantalla, imágenes y diagramas gráficos a **Gemini 3 Flash** (`gemini-3-flash-preview`) aprovechando su visión táctica nativa multimodal.
    - `SEARCH_GROUNDING`: Enruta consultas de versiones actualizadas y librerías externas a **Gemini 3 Flash** con Google Search Grounding en tiempo real.
    - `GENERAL_FAST`: Respuestas instantáneas y chat ágil con **Gemini 3 Flash** o **DeepSeek V3**.
  - **Conmutación Resiliente en Cascada (Cascading Circuit Breaker Failover):**
    - Protocolo de auto-recuperación transparente: si un modelo arroja timeout, error de cuota HTTP 429 o caída 5xx, el sistema conmuta automáticamente al siguiente candidato de la cadena sin interrumpir al Comandante.
    - *Emergency Sentinel Fallback*: En caso de pérdida total de internet o claves de API agotadas, se activa el Núcleo Heurístico Centinela Local (`ares-local-sentinel`) preservando la sesión y estado del proyecto.
  - **Endpoint REST Dedicado:**
    - `POST /api/models/route`: Permite consultar y previsualizar en caliente la decisión del enrutador, su categoría de intención, motivo y cadena de conmutación.
  - **Integración Visual en Tactical HUD & Chat:**
    - Opción predeterminada `🤖 AUTO: Enrutador Inteligente` añadida al selector táctico de modelos de IA.
    - Insignias reactivas en `ChatMessage.vue`:
      - `[🤖 Auto-IA: Modelo [CATEGORÍA]]` para trazabilidad de enrutamiento transparente.
      - `[⚠️ Failover: ModeloInicial ➔ ModeloFinal]` con animación de pulso táctico en caso de conmutación resiliente.
  - **Terminal Táctica Standalone & CLI:**
    - Subcomando `ares route <prompt>` para auditar decisiones de enrutamiento desde CMD / PowerShell / Bash.
    - Soporte nativo de `ares ask -m auto` e integración en el REPL interactivo con la orden `route`.
- **Suite Integral de Pruebas de Regresión (`test-regression-v3.9.mjs`):**
  - Protocolo de verificación automatizado para los 15 subsistemas del monorepo (v3.1 Swarm, v3.2 CI/CD, v3.3 Memoria 128D, v3.4 Radar C4, v3.5/v3.6 Forja DDD & Git Multi-Contributor, v3.7 Standalone CLI & REPL, v3.8 E2E Benchmarks & Stryker, v3.9 Auto-Router AI).
  - Tasa de aprobación del 100% (15/15 subsistemas operativos).
- **Sincronización Monorepo v3.9.0:**
  - Actualización de versión en `@ares-ecosystem/backend`, `@ares-ecosystem/frontend`, `@ares-ecosystem/cli` y `@ares-ecosystem/mcp`.
  - Banner y healthcheck de la API sincronizados a `A.R.E.S. v3.9 Auto-Router AI & Regression Core`.

---

## [3.8.0] - 2026-10-27

### 🧪 Nuevas Funcionalidades (Features)
- **Suite de Pruebas E2E, Mutación con Stryker y Benchmarks k6 (DDD Industrial Suite):**
  - **Pruebas de Integración End-to-End Multicontexto (`BenchmarkService`):**
    - Generador automático de tests de integración para Bounded Contexts DDD (`tests/e2e/integration.e2e.test.ts`).
    - Validación de consistencia eventual, orquestación de casos de uso y propagación de Domain Events entre contextos.
  - **Pruebas de Mutación con Stryker (`stryker.config.json`):**
    - Configuración oficial `@stryker-mutator/core` con plugins: `EqualityOperator`, `BooleanLiteral`, `ArithmeticOperator`, `BlockStatement`, `ConditionalExpression`.
    - Motor de cálculo y simulación del *Mutation Score Indicator (MSI)* para eliminar falsos positivos en entidades y Value Objects.
    - Informe detallado de mutantes evaluados: mutantes asesinados (*Killed*) vs sobrevivientes (*Survived*) y pruebas que los detectaron.
  - **Benchmarks de Carga y Concurrencia Grafana k6 (`benchmarks/k6-load-test.js`):**
    - Generación de escenarios k6: Smoke test (2 VUs), Ramping load test (50 VUs nominal), y Stress spikes (150 VUs).
    - Métricas de rendimiento: Throughput (RPS), percentiles de latencia P50, P90, P95 (&lt; 200ms) y P99 (&lt; 400ms).
    - Umbrales de calidad (Thresholds) y verificación de tasa de errores HTTP (0.00%).
  - **Integración Nativa en la Forja Soberana de Ejercicios:**
    - Inclusión automática de `tests/e2e/integration.e2e.test.ts`, `stryker.config.json`, `benchmarks/k6-load-test.js` y `scripts/run-benchmarks.bat` en cada `.zip` forjado.
    - Commit atómico exclusivo en el plan Git: `test(e2e-benchmarks): end-to-end integration suite, stryker mutation config and k6 performance benchmarks`.
  - **Panel Visual en Frontend (`BenchmarkSuiteModal.vue`):**
    - Pestañas interactivas para Mutación Stryker (MSI), Carga k6 y Tests E2E.
    - Visor de código con botones de un clic para copiar y descargar scripts.
    - Botón de disparo en vivo con animación de telemetría y ejecución en tiempo real.
  - **Comandos Standalone en Terminal:**
    - Subcomando `ares benchmark [titulo]` en CLI.
    - Orden `benchmark` en la Terminal Táctica Standalone REPL con métricas a color.
  - **Sincronización Total Monorepo:** Versión `3.8.0` en backend, frontend, cli y mcp.

---

## [3.7.0] - 2026-10-27

### ⚡ Nuevas Funcionalidades (Features)
- **Terminal Táctica Standalone & Banner Cibernético PCB (Puente hacia A.R.E.S. v4.0):**
  - **Banner de Placa de Circuito Impreso (PCB) (`banner.ts`):**
    - Recreación en arte ASCII/Unicode del diseño de hardware táctico con microprocesadores de silicio, líneas de trazas de cobre cian y pines de conexión en la base conforme al diseño táctico de referencia.
    - Tarjeta de telemetría del sistema (`imprimirTarjetaEstado`) con tiempo activo, postura de enlace, bio-estamina y núcleo IA.
  - **Shell Interactivo REPL Standalone (`TacticalRepl` en `repl.ts`):**
    - Terminal interactiva 100% autónoma ejecutable desde CMD, PowerShell o Bash sin necesidad de abrir la interfaz web.
    - Autocompletado dinámico mediante tecla `Tab` para órdenes operativas (`chat`, `forge`, `swarm`, `audit`, `radar`, `memory`, `bio`, `status`, `help`, `clear`, `exit`).
    - Streaming en consola pura token a token con cadencia táctica inmersiva.
    - Ejecución integrada de misiones del Enjambre Multi-Agente (`swarm <misión>`), Forja Soberana de Ejercicios DDD (`forge [archivo]`), Auditoría OWASP/Big-O (`audit <archivo>`), Topología C4 (`radar`), y Búsqueda Semántica Vectorial (`memory <query>`).
    - Arranque automático en modo REPL al ejecutar simplemente `ares` sin argumentos en la consola.
  - **Comandos Standalone en Línea de Comandos (`cli/src/index.ts`):**
    - Subcomando `ares repl` / `ares shell` para iniciar la sesión interactiva en cualquier momento.
    - Subcomando `ares chat <mensaje...>` para consultas rápidas con respuesta y postura táctica en la consola.
  - **Sincronización Total de Versiones:**
    - Monorepo actualizado a `3.7.0` en todos los paquetes (`@ares-ecosystem/cli`, `@ares-ecosystem/backend`, `@ares-ecosystem/frontend`, `@ares-ecosystem/mcp`).
    - Badge de HUD web actualizado a `v3.7 STANDALONE CLI`.
    - Healthcheck de backend sincronizado a `A.R.E.S. v3.7 Standalone CLI Core`.

---

## [3.6.0] - 2026-10-27

### 👥 Nuevas Funcionalidades (Features)
- **Matriz de Equipo & Multi-Contributor Git Dispatcher (Squad Colaborativo DDD):**
  - **Gestor de Squad de Equipo (`AssignmentForgeModal.vue`):**
    - Selector de modo: Alternancia fluida entre **Modo Individual** y **Modo Squad de Equipo (Multi-Contributor)**.
    - Registro configurable de integrantes: nombre/alias, correo oficial de GitHub para iluminación de contribuciones y rol en el proyecto (*Tech Lead*, *Backend Dev*, *QA Auditor*).
    - Botón **`[ ⚖️ Repartir Contextos ]`**: Algoritmo de distribución equitativa de Bounded Contexts entre los miembros del equipo.
    - Selector interactivo de chips para asignar o desasignar Bounded Contexts puntuales a cada desarrollador.
  - **Firma Atómica de Commits Individualizada (`GitAutomatorService`):**
    - Cada commit atómico es firmado con el autor específico del integrante asignado a ese Bounded Context (`--author="Nombre <email@gmail.com>"`).
    - Los commits de scaffolding y shared kernel son asignados al Tech Lead / Coordinador.
    - Los commits de dominio, aplicación e infraestructura de cada contexto son firmados por su respectivo desarrollador.
  - **Scripts de Automatización Multi-Autor (`setup-git.bat` / `setup-git.sh`):**
    - Los scripts ejecutables integrados en el `.zip` alternan dinámicamente el parámetro `--author` por commit, registrando contribuciones para todos los integrantes al correr en terminales Windows, Linux o macOS.
  - **Métricas Visuales de Contribución del Squad:**
    - Visualizador de porcentaje y recuento de commits por integrante con barras de progreso con gradientes neón (`#00ffaa`, `#00e5ff`, `#c084fc`).
    - Badges de autor (`👤 Nombre`) en cada tarjeta del explorador de commits planificados.
  - **README.md Grupal Humanizado:**
    - Generación automática de la tabla de matriz de responsabilidades por Bounded Context y redacción en primera persona del plural adaptada para entregas en equipo.
  - **Sincronización Total de Versiones:** Monorepo actualizado a la versión `3.6.0` (`@ares-ecosystem/backend`, `@ares-ecosystem/frontend`, `@ares-ecosystem/cli`, `@ares-ecosystem/mcp`).

---

## [3.5.0] - 2026-10-27

### 📋 Nuevas Funcionalidades (Features)
- **Autómata Git Soberano, Desofuscador de PDFs y Commits Atómicos por Bounded Context (Sovereign Git & Exercise Forge):**
  - **Desofuscador y Sanitizador de Enunciados Crudos (`ExerciseParserService`):**
    - Limpieza heurística de ruido académico (encabezados de exámenes universitarios, nombres de docentes, fechas, numeración de páginas *"Página X de Y"* y líneas divisorias).
    - Reensamblado automático de palabras cortadas por guiones al final de línea (`desa- rrollo` ➔ `desarrollo`, `estudian- tes` ➔ `estudiantes`).
    - Descomposición semántica de texto libre en especificación formal DDD: identificación de título, Bounded Contexts, entidades de dominio, Value Objects inmutables, invariantes de negocio y casos de uso.
    - Generación automática del artefacto formal `SPECIFICATION.md`.
  - **README.md Humanizado (Estilo "Hecho por Ti"):**
    - Redacción en primera persona con estilo natural de estudiante o ingeniero desarrollador (sin lenguaje acartonado ni clichés de IA).
    - Firma explícita del autor con nombre y correo de GitHub (`Kevin Commander <kevin.commander@gmail.com>`).
    - Explicación de motivos de diseño para aplicar Domain-Driven Design y Arquitectura Hexagonal.
    - Guía de ejecución local (`npm install`, `npm run build`, `npm start`) y suite de pruebas unitarias (`npm test`).
  - **División Atómica de Commits por Bounded Context (`GitAutomatorService`):**
    - Slicing automático y secuencial de archivos en commits atómicos:
      - `chore(scaffold)`: Configuración base, TypeScript y especificación.
      - `feat(shared-kernel)`: Abstracciones transversales, BaseEntity, ValueObject, DomainEvent y AggregateRoot.
      - Para cada Bounded Context: `feat(<context>-domain)`, `feat(<context>-application)`, `feat(<context>-infrastructure)`, `test(<context>)`.
      - `feat(core)`: Entrypoint `main.ts` y composition root.
      - `docs`: README.md humanizado y documentación.
    - Atribución auténtica en cada commit mediante el parámetro `--author="Nombre <correo@gmail.com>"` para registrar contribuciones legítimas en el perfil de GitHub del desarrollador.
  - **Scripts de Automatización Táctica & Empaquetado Dual:**
    - Generación de scripts listos para doble clic: `setup-git.bat` (Windows CMD) y `setup-git.sh` (Linux/macOS) dentro del `.zip`.
    - Sandbox Git local en backend con ejecución en tiempo real de comandos `git init`, `git checkout -b`, `git commit --author` y `git push -u origin <branch>` autenticado con Personal Access Token.
  - **Modal Interactivo `[ 📋 FORJA GIT ]` (`AssignmentForgeModal.vue`):**
    - Asistente de 4 fases con presets de prueba rápida (Préstamos Bibliotecarios DDD, E-Commerce Microservicios, Citas Médicas).
    - Editor de configuración de autor para Git, visor interactivo del cronograma de commits y consola de logs de ejecución Git en vivo.
  - **Comandos en Terminal y CLI:**
    - Terminal táctica web (`TacticalTerminal.vue`): comandos `forge`, `assign` y `git`.
    - CLI Táctico de consola (`cli/src/index.ts`): comando `ares forge [archivo] -a <autor> -e <correo> -o <salida>`.
  - **Sincronización Total de Versiones:** Monorepo actualizado a la versión `3.5.0` (`@ares-ecosystem/backend`, `@ares-ecosystem/frontend`, `@ares-ecosystem/cli`, `@ares-ecosystem/mcp`).

---

## [3.4.0] - 2026-10-27

### 🌐 Nuevas Funcionalidades (Features)
- **Radar de Arquitectura de Sistemas C4 & Tracing de Eventos (Interactive C4 Topology Radar):**
  - **Lienzo Topológico Interactivo en Vivo (`ArchitectureRadarModal.vue`):**
    - Renderizado de nodos según arquetipos DDD (`client`, `gateway`, `service`, `database`, `queue`).
    - Flujo de tráfico en tiempo real con partículas y líneas discontinuas animadas mediante gradientes neón (`#00ffaa` a `#0284c7`).
    - Métricas globales consolidadas: Total RPS, Latencia P50, Error Rate y adherencia SOLID.
  - **Catálogo de Topologías Distribuidas Maestras:**
    - *A.R.E.S. Sovereign Industrial Core:* Topología hexagonal monorepo enlazando HUD 3D, Express API, SQLite WAL, Redis y Multi-LLM Gateway.
    - *E-Commerce Global DDD Distribuido:* Arquitectura event-driven con bounded contexts desacoplados (Catálogo, Pedidos, Facturación SUNAT con IGV 18% y Event Bus).
  - **Inspector Táctico de Nodos (Node Inspector):**
    - Inspección en caliente de Bounded Context, Capa DDD (*Presentation*, *Application*, *Domain*, *Infrastructure*), latencia nominal y carga por segundo.
    - Enlace reactivo directo con el Oráculo de Memoria Vectorial (v3.3) mediante botón `[ Ver ADR ➔ ]`.
  - **Simulador de Ráfagas de Tráfico & Chaos Engineering:**
    - Botón `[ ⚡ Ráfaga (2.5x) ]`: Simulación de picos de carga (escalado hasta 850+ RPS) con recálculo dinámico de latencia por nodo.
    - Botón `[ 💥 Inyectar Caos ]`: Simulación de degradación de red y activación automática de *Circuit Breakers* y modos defensivos.
    - Botón `[ 🔄 Restaurar ]`: Recuperación instantánea al estado nominal 100% saludable.
  - **Exportador C4 Container Formal:**
    - Generador de especificaciones Mermaid en sintaxis estándar `C4Container` (`Person`, `Container`, `ContainerDb`, `ContainerQueue`, `Rel`) con modal de copiado y botón directo `[ 💬 Enviar al Chat ]`.
  - **Comandos en la Terminal Táctica Shell (`TacticalTerminal.vue`):**
    - `radar open`: Apertura del Radar Topológico C4.
    - `radar traffic`: Disparo de ráfaga de tráfico.
  - **Sincronización Total de Versiones:** Nivelación a `3.4.0` en todos los módulos (`@ares-ecosystem/frontend`, `@ares-ecosystem/backend`, `@ares-ecosystem/cli`, `@ares-ecosystem/mcp`).

---

## [3.3.0] - 2026-10-27

### 🧠 Nuevas Funcionalidades (Features)
- **Oráculo de Memoria Semántica Vectorial Local (128D Vector Memory & RAG):**
  - Motor vectorial local implementado sobre `node:sqlite` nativo en modo WAL con cálculo de **Similitud de Cosenos** y latencias inferiores a **1.5ms**.
  - **Normalización Euclidiana L2 & Hashing Semántico Ponderado:** Vectorización determinista de 128 dimensiones con extracción de n-gramas, filtrado de stopwords y pesos morfológicos.
  - **Base de Conocimiento Arquitectónico Pre-cargada:** Siembra automática de 6 pilares de ingeniería de software:
    - `ADR-001`: Arquitectura Hexagonal y Puertos/Adaptadores en Monorepo TypeScript.
    - `ADR-002`: Inmutabilidad Absoluta en Value Objects y Entidades DDD.
    - `ADR-003`: Persistencia de Ultra Baja Latencia con `node:sqlite` Nativo.
    - `ADR-004`: Blindaje contra Supply Chain Attacks en Pipelines de CI/CD.
    - `CODE-001`: Generic Result / Either Monad Tipado para Manejo Funcional de Errores.
    - `SEC-001`: Directivas OWASP Top 10 para Sanitización en Node.js 24 y Express 5.
  - **RAG Táctico en el Chat (`chat.service.ts`):** Inyección contextual automática de memorias arquitectónicas con similitud $\ge 65\%$ en consultas dirigidas a A.R.E.S. Prime o al Enjambre Multi-Agente.
  - **MemoryOracleModal.vue (`[ 🧠 MEMORIA ]`):**
    - **Búsqueda Semántica en Lenguaje Natural:** Input con slider dinámico de umbral (40% a 85%), filtro por colección, tags rápidos y tarjetas de resultados con badge de porcentaje de coincidencia (**MATCH**).
    - **Forja de Memorias:** Formulario para indexar nuevos ADRs, snippets o reglas técnicas con vectorización inmediata.
    - **Banco de Conocimiento & Telemetría:** Explorador de documentos, métricas de dimensionalidad vectorial y tags únicos.
  - **Terminal Táctica Shell (`TacticalTerminal.vue`):** Comandos `memory open`, `memory search <consulta>` y `memory stats`.
  - **Sincronización Total de Versiones:** Nivelación a `3.3.0` en todos los módulos (`@ares-ecosystem/frontend`, `@ares-ecosystem/backend`, `@ares-ecosystem/cli`, `@ares-ecosystem/mcp`).

---

## [3.2.0] - 2026-10-27

### 🚀 Nuevas Funcionalidades (Features)
- **Motor de Pipelines CI/CD & Despliegues Autónomos (Autonomous CI/CD Engine):**
  - Orquestación y simulación local en tiempo real de pipelines de despliegue industrial de 6 etapas:
    1. 🔍 **Lint & Types:** Typecheck estricto con `vue-tsc` y `tsc` para frontend y backend.
    2. 🧪 **Test Suite:** Verificación de invariantes DDD y Value Objects inmutables con suites Vitest/Jest.
    3. 🛡️ **OWASP Security Audit:** Escaneo de CVEs en árbol de dependencias y auditoría de secretos.
    4. 🐳 **Docker Multi-Stage Build:** Optimización de capas OCI con usuario no-root (`node:24-bookworm-slim` + `dumb-init`) con reducción del 68% en huella de imagen.
    5. 🚀 **Cloud Deploy:** Disparo de webhooks seguros hacia Render Cloud, GitHub Pages y VPS Linux.
    6. ❤️ **Zero-Downtime Healthcheck:** Sondeo activo contra el endpoint `/health` (espera de 200 OK) previo a conmutación final de tráfico.
  - **PipelineMonitorModal.vue (`[ 🚀 CI/CD ]`):**
    - **Grafo Visual de Nodos en Tiempo Real:** Visualización horizontal de etapas con animación de pulso neón, badges de estado (`PENDING`, `RUNNING`, `SUCCESS`, `FAILED`), cronometraje por etapa y consola de logs integrada.
    - **Protocolo de Rollback Táctico Inmediato:** Botón `[ 🚨 Rollback Táctico ]` para simular y ejecutar la reversión instantánea al commit previo estable.
    - **Forja de Workflows & Plantillas Multi-Nube:** Selector interactivo de plantillas maestras (Render Monorepo Full-Stack, GitHub Pages SPA, Docker VPS Traefik) con generación y descarga de `deploy.yml`, `Dockerfile`, `docker-compose.prod.yml` y `.dockerignore`.
    - **Auditor de Seguridad de CI/CD:** Análisis estático de workflows YAML para detectar Supply Chain Attacks (tags mutables `@master`), permisos excesivos (`write-all`), ausencia de timeouts y falta de sondas healthcheck.
  - **Comandos en la Terminal Táctica Shell (`TacticalTerminal.vue`):**
    - `cicd open`: Apertura inmediata del orquestador y monitor visual.
    - `cicd run`: Disparo de la simulación de pipeline en caliente.
    - `docker`: Acceso a la forja de Dockerfiles multi-stage.
  - **Sincronización Total de Versiones:** Nivelación a `3.2.0` en todos los módulos (`@ares-ecosystem/frontend`, `@ares-ecosystem/backend`, `@ares-ecosystem/cli`, `@ares-ecosystem/mcp`).

---

## [3.1.0] - 2026-10-27

### 🐝 Nuevas Funcionalidades (Features)
- **Enjambre de Subagentes Especializados (Multi-Agent Sovereign Swarm):**
  - Orquestación jerárquica de 4 subagentes técnicos especializados con prompts de rol y contratos estrictos:
    - **Atenea (Orquestador & Auditor DDD):** Descompone la misión, define bounded contexts y audita el cumplimiento de DDD y Clean Architecture.
    - **Vulcano (Arquitecto de Dominio & Casos de Uso):** Forja entidades puras, value objects inmutables, repositorios y puertos.
    - **Mercurio (Ingeniero de Interfaz & Live Preview):** Genera interfaces interactivas con Tailwind CSS, componentes reactivos y vistas responsive sin dependencias relativas rotas.
    - **Némesis (Auditor de Calidad & Generador de Tests):** Genera suites de pruebas con Vitest/Jest, verifica invariants y edge cases.
  - **SwarmMonitorModal.vue:** Monitor táctico del enjambre con telemetría en tiempo real, selector de misiones predefinidas (*E-Commerce DDD*, *Microservicio Auth*, *Dashboard Realtime*) y logs en streaming de agentes.
  - **Lanzador de Misiones Instantáneo (Preset One-Click):** Botones `[ ▶ Lanzar Ahora ]` y `[ ✏️ Modificar ]` para ejecución inmediata en consola o personalización previa.
  - **Selector de Modo Táctico en ChatConsole:** Pestañas `[ 🛡️ A.R.E.S. Prime ]` y `[ 🐝 Enjambre Multi-Agente ]` para alternar entre el copiloto central y el enjambre distribuido.

### 🛠️ Correcciones y Refactorizaciones (Fixes)
- **Extracción Multi-Archivo desde Bloques Únicos (`zip.service.ts`):** Parser heurístico mejorado que detecta y separa múltiples archivos concatenados por LLMs dentro de un único bloque de código (mediante delimitadores `// File: ruta` o `<!-- Archivo: ruta -->`), garantizando la preservación completa del árbol DDD en el archivo `.zip`.
- **Extracción Incondicional de Sandboxes HTML:** Se eliminó la restricción que omitía bloques `<!DOCTYPE html>` cuando ya existían archivos de dominio, permitiendo que las vistas web completas siempre se sincronicen en `index.html`.
- **Universal Live Preview Synthesizer (`preview-compiler.service.ts`):** 
  - Síntesis interactiva completa para dominios de alimentación/ensaladas saludables (`sintetizarEnsaladaApp`):
    - Catálogo visual interactivo con 8 ingredientes clasificados por categorías (Vegetales, Proteínas, Toppings, Aderezos).
    - Creador de Bowls en Vivo con cálculo dinámico de calorías (kcal) y precio en tiempo real.
    - Drawer de Carrito de Compras con ajuste reactivo de cantidades y umbral de envío gratuito.
    - Modal de Boleta Electrónica Oficial (B001-000492) con desglose de ítems, subtotal, IGV (18%) y despacho de eventos de dominio (`OrderPlacedEvent`).
    - Modos de inspección multi-dispositivo (Desktop, Tablet 768px, Móvil 375px) 100% operativos.
- **Instrucciones Estrictas para Agentes LLM (`swarm.service.ts` & `gemini.service.ts`):** Directiva reforzada que prohíbe terminantemente el uso de scripts relativos (`<script src="app.js"></script>`) en sandboxes `iframe srcdoc`, forzando JavaScript/Vue inline autónomo.

---

## [3.0.0] - 2026-10-27

### 🌟 Hito Mayor (Major Release - Sovereign Autonomous Engineering)
- **Consolidación de la Era v3.0:** Elevación de versión mayor del ecosistema A.R.E.S., unificando la suite sensorial (voz y audio procedural), la forja modular DDD en paquetes comprimidos `.zip`, la previsualización interactiva con sandboxes reactivos en tiempo real y la ingesta profunda de repositorios GitHub.
- **Sincronización Total de Versiones:** Nivelación a `3.0.0` en todos los módulos (`@ares-ecosystem/frontend`, `@ares-ecosystem/backend`, `@ares-ecosystem/cli`, `@ares-ecosystem/mcp`).
- **Preparación de Infraestructura Autónoma:** Base establecida para la integración de agentes cooperativos, pipelines de verificación CI/CD autónomos y arquitecturas de ejecución distribuida.

---

## [2.9.0] - 2026-10-27

### 🚀 Nuevas Funcionalidades (Features)
- **🎙️ Oído Digital Táctico (Web Speech API):** Reconocimiento de voz continuo con transcripción en caliente hacia la consola de órdenes tácticas.
- **📊 Analizador Espectral de Ondas Holográficas:** Captura en vivo de frecuencias vocales en 16 bandas mediante `AudioContext` y `AnalyserNode` con animación neón en el HUD.
- **⚡ Despacho Fonético Directo:** Detección de comandos verbales (*"A.R.E.S., enviar"*, *"enviar orden"*, *"ejecutar orden"*) para transmisión instantánea al store sin intervención manual.
- **🔍 Ingesta & Auditoría de Repositorios GitHub:** Extracción de árbol de directorios y manifiestos de repositorios públicos con diagnóstico OWASP Top 10, cálculo de complejidad Big-O y diagramas C4 en Mermaid.
- **⚔️ Modos de Combate Estratégico:** Conmutador interactivo de roles operativos: Centinela (Auditor riguroso), Blitzkrieg (Prototipador ágil) y Arquitecto (Diseñador de sistemas y RFCs).
- **📥 Exportación de Misión Táctica:** Generación y descarga directa en Markdown de la sesión completa de combate técnico.

### 🛠️ Correcciones y Refactorizaciones (Fixes)
- **Voice Dispatch Fix:** Desacoplamiento resuelto en el botón `[ ENVIAR AHORA ➔ ]` del HUD y normalización de puntuación en transcripciones en español.
- **DDD Live Preview Synthesis Fix:** Solución integral al renderizado en blanco de sandboxes para arquitecturas multi-archivo mediante el generador unificado `sintetizarCafeShopApp` y `sintetizarAuthJwtApp` en `preview-compiler.service.ts`, desplegando aplicaciones ricas con Tailwind CSS, catálogo, carrito interactivo y responsive design (Desktop, Tablet, Móvil).

---

## [2.8.0] - 2026-10-26

### 🚀 Nuevas Funcionalidades (Features)
- **🖥️ Live Web Preview Sandbox:** Ejecución aislada en un `iframe` seguro (`srcdoc`) con recarga en caliente de código HTML, CSS, JavaScript y Vue 3.
- **📱 Viewport Selector Multi-Dispositivo:** Modos de inspección en vivo para Desktop (100%), Tablet (768px) y Móvil (375px).
- **📟 Terminal Táctica Web Shell Embebida:** Shell interactiva accesible mediante el botón `[>_ TERMINAL]` o el atajo global `Ctrl + \`` para control de poses FSM, modelos de IA y telemetría biométrica.

---

## [2.7.0] - 2026-10-26

### 🚀 Nuevas Funcionalidades (Features)
- **📦 Forja de Proyectos & Empaquetador .ZIP:** Generación de estructuras de código completas bajo Domain-Driven Design (DDD) con capas desacopladas (`domain/`, `application/`, `infrastructure/`, `presentation/`).
- **📁 Inyección Automática de Boilerplate:** Complementación reactiva de archivos base (`package.json`, `vite.config.ts`, `index.html`, `src/main.ts`) para ejecución inmediata tras descarga.
- **🗂️ ProjectZipForge.vue:** Componente interactivo para exploración del árbol virtual de archivos y compresión en el cliente con `jszip`.

---

## [2.6.0] - 2026-10-26

### 🚀 Nuevas Funcionalidades (Features)
- **🏛️ Arquitectura Hexagonal y Persistencia SQLite:** Persistencia nativa de conversaciones y documentos técnicos mediante `node:sqlite`.
- **🎭 Avatar 3D Voxel (Three.js):** Renderizado en tiempo real con Toon Shading y FSM de 16 Poses reactivas sincronizadas con el flujo de razonamiento.
- **🛡️ Escudo Aegis (DocShield):** Generador de README maestros, ADRs Nygard correlativos, contratos OpenAPI 3.1 YAML y RFCs.
- **⚔️ Espada Binaria (CodeSword) & Test Forge:** Auditoría OWASP, métricas Big-O y generador de suites de prueba unitarias para Vitest, Jest, PyTest y Go.
- **❤️‍🩹 Protocolo Bio-Armadura:** Monitoreo biométrico de estamina, hidratación y Pomodoro táctico para mitigar la fatiga del desarrollador.

---

## [2.0.0] - 2026-10-26

### 🏷️ Release Oficial v2.0
- Consolidación del ecosistema táctico A.R.E.S. en producción sobre Render Cloud y GitHub.
