# CHANGELOG: A.R.E.S. Ecosystem

Todos los cambios notables en este proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/) y adherido a [Semantic Versioning](https://semver.org/).

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
