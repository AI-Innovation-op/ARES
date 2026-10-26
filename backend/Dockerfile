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

# Copiar manifiestos y dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el build compilado desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Crear directorio para la base de datos persistente
RUN mkdir -p /app/database

# Puerto de la API
EXPOSE 3000

# Punto de entrada
CMD ["node", "dist/app.js"]
