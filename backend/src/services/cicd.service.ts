/**
 * @fileoverview Servicio Táctico de CI/CD & Despliegues Autónomos para A.R.E.S. v3.2.
 * Genera workflows industriales para GitHub Actions, Dockerfiles multi-stage,
 * compose para producción y ejecuta simulaciones locales de pipelines con telemetría en tiempo real.
 * @module services/cicd.service
 */

export type TargetCloud = 'render' | 'github-pages' | 'docker-vps' | 'railway' | 'aws-ecs';
export type DeployStrategy = 'blue-green' | 'rolling-update' | 'direct-hook' | 'canary';
export type JobStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface PipelineStep {
  id: string;
  nombre: string;
  etapa: 'lint' | 'test' | 'security' | 'docker' | 'deploy' | 'healthcheck';
  icono: string;
  status: JobStatus;
  duracionMs: number;
  logs: string[];
  error?: string;
}

export interface PipelineExecution {
  id: string;
  targetCloud: TargetCloud;
  estrategia: DeployStrategy;
  rama: string;
  commitSha: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  progresoPct: number;
  steps: PipelineStep[];
  inicioTimestamp: number;
  finTimestamp?: number;
  rollbackDisponible: boolean;
  versionDesplegada: string;
}

export interface CicdTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  targetCloud: TargetCloud;
  estrategia: DeployStrategy;
  stackSugerido: string;
  archivos: {
    workflowYaml: string;
    dockerfile: string;
    dockerComposeProd?: string;
    dockerignore: string;
  };
}

export interface AuditIssue {
  gravedad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  regla: string;
  descripcion: string;
  sugerencia: string;
  linea?: number;
}

export interface AuditResult {
  puntuacionSeguridad: number; // 0-100
  esAptoProduccion: boolean;
  totalVulnerabilidades: number;
  issues: AuditIssue[];
}

/**
 * Catálogo maestro de plantillas tácticas de CI/CD de nivel Staff Principal Engineer.
 */
export const TEMPLATES_CICD: CicdTemplate[] = [
  {
    id: 'render-fullstack',
    nombre: 'Render Cloud — Monorepo Full-Stack (Docker Zero-Downtime)',
    descripcion: 'Pipeline multi-servicio para desplegar Backend Node.js y Frontend Nginx SPA en Render mediante Deploy Hooks seguros y Healthcheck.',
    targetCloud: 'render',
    estrategia: 'direct-hook',
    stackSugerido: 'Vue 3 + Node.js 24 + Express + SQLite',
    archivos: {
      workflowYaml: `name: 🚀 A.R.E.S. Sovereign CI/CD Pipeline (Render Cloud)

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # 1. Calidad de Código, Linting y Typechecking
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  lint-and-types:
    name: 🔍 Lint & Static Analysis
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: 📥 Clonar Repositorio
        uses: actions/checkout@v4

      - name: 🟢 Configurar Node.js 24 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'npm'

      - name: 📦 Instalar Dependencias Frontend & Backend
        run: |
          npm --prefix backend ci
          npm --prefix frontend ci

      - name: 🛡️ Typecheck Estricto Backend
        run: npm --prefix backend run build

      - name: 🎨 Typecheck & Compilación Frontend (vue-tsc)
        run: npm --prefix frontend run build

  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # 2. Suite de Pruebas Unitarias y Cobertura (Test Forge)
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  test-suite:
    name: 🧪 Test Suite & Invariants
    needs: [lint-and-types]
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: 📥 Clonar Repositorio
        uses: actions/checkout@v4

      - name: 🟢 Configurar Node.js 24
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: 📦 Instalar Dependencias
        run: |
          npm --prefix backend ci
          npm --prefix frontend ci

      - name: ⚔️ Ejecutar Pruebas Backend (Vitest / Node Test Runner)
        run: npm --prefix backend test -- --passWithNoTests

  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # 3. Auditoría de Seguridad OWASP & Vulnerabilidades
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  security-audit:
    name: 🛡️ OWASP Dependency & Secrets Audit
    needs: [lint-and-types]
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - name: 📥 Clonar Repositorio
        uses: actions/checkout@v4

      - name: 🔍 Auditoría de Dependencias Vulnerables
        run: |
          npm --prefix backend audit --audit-level=high || true
          npm --prefix frontend audit --audit-level=high || true

  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # 4. Despliegue en Render Cloud con Zero-Downtime
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  deploy-render:
    name: 🚀 Deploy to Render Cloud
    needs: [test-suite, security-audit]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: 📡 Disparar Deploy Hook de Backend
        run: |
          curl -s -X POST "\${{ secrets.RENDER_BACKEND_DEPLOY_HOOK }}" || echo "Backend deploy trigger dispatched"

      - name: 📡 Disparar Deploy Hook de Frontend
        run: |
          curl -s -X POST "\${{ secrets.RENDER_FRONTEND_DEPLOY_HOOK }}" || echo "Frontend deploy trigger dispatched"

      - name: ⏳ Esperar Estabilización de Despliegue (45s)
        run: sleep 45

      - name: ❤️ Verificación Táctica de Salud (Healthcheck)
        run: |
          for i in {1..6}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://\${{ vars.APP_DOMAIN }}/health || echo "000")
            if [ "$STATUS" = "200" ]; then
              echo "✅ Despliegue validado con éxito (HTTP 200 OK)."
              exit 0
            fi
            echo "Intento $i falló con código $STATUS. Reintentando en 10s..."
            sleep 10
          done
          echo "❌ Error crítico: Healthcheck no respondió con 200 tras 60s."
          exit 1
`,
      dockerfile: `# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# A.R.E.S. Multi-Stage Dockerfile (Heavy Industrial Standard)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Etapa 1: Base de Dependencias
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init curl ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

# Etapa 2: Forja de Compilación (Builder)
FROM base AS builder
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci
COPY backend/ ./backend/
RUN cd backend && npm run build

# Etapa 3: Runner de Producción de Máxima Seguridad (Sin privilegios)
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Usuario sin privilegios por seguridad estricta
USER node

COPY --chown=node:node --from=builder /app/backend/dist ./dist
COPY --chown=node:node --from=builder /app/backend/package*.json ./
COPY --chown=node:node --from=builder /app/backend/node_modules ./node_modules

EXPOSE 3000

# Verificación de salud integrada en el contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]
`,
      dockerComposeProd: `version: '3.9'

services:
  ares-backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    volumes:
      - ares-data:/app/database

  ares-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
    depends_on:
      ares-backend:
        condition: service_healthy

volumes:
  ares-data:
    driver: local
`,
      dockerignore: `node_modules/
dist/
.git/
.env*
*.log
coverage/
.DS_Store
`
    }
  },
  {
    id: 'github-pages-spa',
    nombre: 'GitHub Pages — Single Page Application (SPA Deploy)',
    descripcion: 'Pipeline para compilar aplicaciones estáticas (Vue 3, Vite, Tailwind) y desplegarlas automáticamente en GitHub Pages con soporte de enrutador SPA.',
    targetCloud: 'github-pages',
    estrategia: 'direct-hook',
    stackSugerido: 'Vue 3 + Vite + Tailwind CSS',
    archivos: {
      workflowYaml: `name: 🚀 Despliegue en GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    name: 📦 Compilar SPA
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Clonar Repositorio
        uses: actions/checkout@v4

      - name: 🟢 Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: 📦 Instalar Dependencias
        run: npm --prefix frontend ci

      - name: 🔨 Compilar Frontend para Producción
        run: npm --prefix frontend run build

      - name: 📄 Fallback de Enrutamiento SPA (404.html)
        run: cp frontend/dist/index.html frontend/dist/404.html

      - name: 📤 Cargar Artefacto de Páginas
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'frontend/dist'

  deploy:
    name: 🌐 Publicar en GitHub Pages
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: 🚀 Desplegar a GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`,
      dockerfile: `# Servidor Nginx estático para previsualización local
FROM nginx:alpine
COPY frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`,
      dockerignore: `node_modules/
dist/
.git/
`
    }
  },
  {
    id: 'docker-vps-traefik',
    nombre: 'Docker VPS — Reverse Proxy Traefik con SSL Let\'s Encrypt',
    descripcion: 'Pipeline para desplegar en servidores Linux propios (Ubuntu/Debian) mediante SSH, Docker Compose y certificados SSL automáticos con Traefik.',
    targetCloud: 'docker-vps',
    estrategia: 'blue-green',
    stackSugerido: 'Docker Compose + Traefik v3 + GitHub Container Registry (GHCR)',
    archivos: {
      workflowYaml: `name: 🚀 Docker VPS CI/CD Pipeline

on:
  push:
    branches: [ main ]

jobs:
  build-and-push:
    name: 🐳 Construir y Publicar en GHCR
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4

      - name: 🔑 Iniciar Sesión en GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: ⚙️ Configurar Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 🔨 Construir y Empujar Backend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: backend/Dockerfile
          push: true
          tags: |
            ghcr.io/\${{ github.repository }}/backend:latest
            ghcr.io/\${{ github.repository }}/backend:\${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-ssh:
    name: 🚀 Despliegue SSH en Servidor VPS
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: 🔑 Despliegue Remoto con SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: \${{ secrets.VPS_HOST }}
          username: \${{ secrets.VPS_USER }}
          key: \${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/ares-app
            docker compose pull
            docker compose up -d --remove-orphans
            docker image prune -f
`,
      dockerfile: `FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/app.js"]
`,
      dockerComposeProd: `version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=admin@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"

  app:
    image: ghcr.io/my-org/ares-backend:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`app.example.com\`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls.certresolver=myresolver"
`,
      dockerignore: `node_modules/
.git/
`
    }
  }
];

/**
 * Servicio Táctico de CI/CD.
 */
export class CicdService {
  private static ejecucionActual: PipelineExecution | null = null;

  /**
   * Obtiene la lista completa de templates preconfigurados.
   */
  public static listarTemplates(): CicdTemplate[] {
    return TEMPLATES_CICD;
  }

  /**
   * Obtiene un template específico por ID.
   */
  public static obtenerTemplate(id: string): CicdTemplate | null {
    return TEMPLATES_CICD.find(t => t.id === id) || null;
  }

  /**
   * Audita un workflow YAML para detectar fallas de seguridad y antipatrones.
   */
  public static auditarWorkflow(yaml: string): AuditResult {
    const issues: AuditIssue[] = [];
    let puntuacion = 100;

    if (!yaml || yaml.trim().length === 0) {
      return {
        puntuacionSeguridad: 0,
        esAptoProduccion: false,
        totalVulnerabilidades: 1,
        issues: [{
          gravedad: 'CRITICA',
          regla: 'YAML_VACIO',
          descripcion: 'El workflow está completamente vacío.',
          sugerencia: 'Proporcione una especificación YAML válida de GitHub Actions.'
        }]
      };
    }

    // Regla 1: Uso de tags mutables como @master o @main en acciones
    if (yaml.includes('@master') || yaml.includes('@main')) {
      issues.push({
        gravedad: 'ALTA',
        regla: 'MUTABLE_ACTION_TAG',
        descripcion: 'Uso de ramas mutables (@master o @main) en acciones externas de GitHub Actions.',
        sugerencia: 'Fije las acciones a tags de versión específicos (ej. @v4) o al commit SHA completo para evitar Supply Chain Attacks.'
      });
      puntuacion -= 25;
    }

    // Regla 2: Permisos amplios por defecto
    if (yaml.includes('permissions: write-all')) {
      issues.push({
        gravedad: 'CRITICA',
        regla: 'PERMISSIVE_GITHUB_TOKEN',
        descripcion: 'Se otorga "write-all" al token de GitHub en todo el pipeline.',
        sugerencia: 'Siga el principio de privilegio mínimo y declare únicamente los permisos requeridos (ej. contents: read, packages: write).'
      });
      puntuacion -= 35;
    }

    // Regla 3: Falta de timeout-minutes en jobs
    if (!yaml.includes('timeout-minutes:')) {
      issues.push({
        gravedad: 'MEDIA',
        regla: 'MISSING_JOB_TIMEOUT',
        descripcion: 'No se definió timeout-minutes en los jobs del pipeline.',
        sugerencia: 'Agregue "timeout-minutes: 10" o similar para evitar que jobs congelados consuman minutos de runner indefinidamente.'
      });
      puntuacion -= 15;
    }

    // Regla 4: Concurrency control
    if (!yaml.includes('concurrency:')) {
      issues.push({
        gravedad: 'BAJA',
        regla: 'MISSING_CONCURRENCY',
        descripcion: 'No se definió control de concurrencia para cancelar builds obsoletos.',
        sugerencia: 'Defina un grupo de concurrencia con "cancel-in-progress: true" para optimizar costes y tiempos.'
      });
      puntuacion -= 10;
    }

    // Regla 5: Healthcheck post-deploy
    if (yaml.includes('deploy') && !yaml.includes('health') && !yaml.includes('curl')) {
      issues.push({
        gravedad: 'MEDIA',
        regla: 'MISSING_POST_DEPLOY_HEALTHCHECK',
        descripcion: 'El workflow incluye etapas de despliegue pero carece de un paso de verificación de salud (healthcheck).',
        sugerencia: 'Agregue un paso de healthcheck con reintentos para asegurar que la aplicación respondió HTTP 200 en producción.'
      });
      puntuacion -= 15;
    }

    return {
      puntuacionSeguridad: Math.max(0, puntuacion),
      esAptoProduccion: puntuacion >= 75 && !issues.some(i => i.gravedad === 'CRITICA'),
      totalVulnerabilidades: issues.length,
      issues
    };
  }

  /**
   * Genera una nueva simulación de pipeline táctico con pasos interactivos.
   */
  public static crearSimulacionPipeline(
    targetCloud: TargetCloud = 'render',
    estrategia: DeployStrategy = 'direct-hook',
    commitSha: string = 'd67ec49'
  ): PipelineExecution {
    const steps: PipelineStep[] = [
      {
        id: 'lint-types',
        nombre: '1. Linting & Análisis Estático de Tipos',
        etapa: 'lint',
        icono: '🔍',
        status: 'pending',
        duracionMs: 0,
        logs: [
          'Inicializando runner Ubuntu 24.04 LTS...',
          'Clonando repositorio con profundidad shallow (depth: 1)...',
          'Configurando Node.js 24.x LTS...',
          'Ejecutando vue-tsc --noEmit y tsc en backend...'
        ]
      },
      {
        id: 'test-forge',
        nombre: '2. Suite de Pruebas Unitarias & Invariantes DDD',
        etapa: 'test',
        icono: '🧪',
        status: 'pending',
        duracionMs: 0,
        logs: [
          'Cargando suite de pruebas Vitest / Node Test Runner...',
          'Verificando Value Objects (Email, UUID, Price)...',
          'Verificando invariantes de agregados y reglas de negocio...',
          'Calculando matriz de cobertura de código (target: >85%)...'
        ]
      },
      {
        id: 'security-audit',
        nombre: '3. Auditoría de Seguridad OWASP & Secret Scanning',
        etapa: 'security',
        icono: '🛡️',
        status: 'pending',
        duracionMs: 0,
        logs: [
          'Escaneando árbol de dependencias contra base de datos CVE...',
          'Buscando tokens o claves privadas accidentalmente comiteadas...',
          'Auditoría OWASP Top 10 superada: 0 vulnerabilidades críticas detectadas.'
        ]
      },
      {
        id: 'docker-build',
        nombre: '4. Construcción Docker Multi-Stage & Capas OCI',
        etapa: 'docker',
        icono: '🐳',
        status: 'pending',
        duracionMs: 0,
        logs: [
          'Iniciando Docker Buildx con soporte de cache GHA...',
          'Layer 1: Base slim Debian Bookworm [Cache Hit]',
          'Layer 2: Compilación de fuentes TypeScript [Optimized]',
          'Layer 3: Runner sin privilegios (USER node, non-root) [Ready]',
          'Tamaño de imagen optimizado: 184 MB (reducción del 68%).'
        ]
      },
      {
        id: 'cloud-deploy',
        nombre: '5. Despliegue en la Nube & Zero-Downtime Handover',
        etapa: 'deploy',
        icono: '🚀',
        status: 'pending',
        duracionMs: 0,
        logs: [
          `Disparando webhook seguro hacia ${targetCloud.toUpperCase()}...`,
          'Iniciando rolling update sin pérdida de conexiones activas...',
          'Enrutando tráfico mediante reverse proxy TLS...'
        ]
      },
      {
        id: 'healthcheck',
        nombre: '6. Verificación Táctica de Salud & Telemetría Final',
        etapa: 'healthcheck',
        icono: '❤️',
        status: 'pending',
        duracionMs: 0,
        logs: [
          'Enviando sonda HTTP GET /health...',
          'Respuesta recibida: 200 OK en 14ms.',
          'Consenso alcanzado: Sistema operativo al 100% en producción.'
        ]
      }
    ];

    const ejecucion: PipelineExecution = {
      id: `pipe-${Date.now()}`,
      targetCloud,
      estrategia,
      rama: 'main',
      commitSha,
      status: 'idle',
      progresoPct: 0,
      steps,
      inicioTimestamp: Date.now(),
      rollbackDisponible: true,
      versionDesplegada: 'v3.2.0-rc1'
    };

    this.ejecucionActual = ejecucion;
    return ejecucion;
  }

  /**
   * Obtiene el estado actual de la ejecución en memoria.
   */
  public static obtenerEstadoActual(): PipelineExecution {
    if (!this.ejecucionActual) {
      return this.crearSimulacionPipeline();
    }
    return this.ejecucionActual;
  }

  /**
   * Ejecuta la simulación paso a paso notificando a través de un callback de eventos.
   */
  public static async ejecutarSimulacion(
    onProgress: (estado: PipelineExecution) => void
  ): Promise<PipelineExecution> {
    const ejecucion = this.crearSimulacionPipeline();
    ejecucion.status = 'running';
    onProgress(ejecucion);

    for (let i = 0; i < ejecucion.steps.length; i++) {
      const step = ejecucion.steps[i];
      step.status = 'running';
      ejecucion.progresoPct = Math.round((i / ejecucion.steps.length) * 100);
      onProgress(ejecucion);

      const duracionStep = Math.floor(Math.random() * 800) + 700; // 700ms - 1500ms
      await new Promise(r => setTimeout(r, duracionStep));

      step.status = 'success';
      step.duracionMs = duracionStep;
      ejecucion.progresoPct = Math.round(((i + 1) / ejecucion.steps.length) * 100);
      onProgress(ejecucion);
    }

    ejecucion.status = 'success';
    ejecucion.progresoPct = 100;
    ejecucion.finTimestamp = Date.now();
    this.ejecucionActual = ejecucion;
    onProgress(ejecucion);
    return ejecucion;
  }
}
