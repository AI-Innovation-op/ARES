# ============================================================================
# DOCKERFILE: A.R.E.S. Backend (Node.js 24 Alpine)
# ============================================================================

# --- Etapa 1: Construcción (Builder) ---
FROM node:24-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias completas para compilar TypeScript
RUN npm ci

# Copiar código fuente y configuración de TypeScript
COPY tsconfig.json ./
COPY src/ ./src/

# Compilar TypeScript a JavaScript (dist/)
RUN npm run build

# --- Etapa 2: Entorno de Producción (Runner) ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_DRIVER=sqlite
ENV SQLITE_DB_PATH=/app/database/ares.db

# git: lo necesita el "Autómata Git" (POST /api/assignment/execute-git). wget ya viene en Alpine (busybox).
RUN apk add --no-cache git

# Copiar manifiestos y dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el build compilado desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Directorio de la base de datos: el usuario "node" (no root) debe poder escribir en él.
# Con un volumen NOMBRADO de Docker, el volumen hereda este dueño la primera vez.
RUN mkdir -p /app/database && chown -R node:node /app

# Ejecutar sin privilegios de root
USER node

# Puerto de la API
EXPOSE 3000

# Docker marca el contenedor como "unhealthy" si /health deja de responder
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Punto de entrada
CMD ["node", "dist/app.js"]
