# ============================================================================
# DOCKERFILE: A.R.E.S. Frontend (Vite + Vue 3 + Nginx Alpine)
# ============================================================================

# --- Etapa 1: Construcción (Builder) ---
FROM node:24-alpine AS builder

WORKDIR /app

# Copiar manifiestos
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar archivos fuente y configuración
COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.* ./
COPY src/ ./src/

# Compilar para producción (dist/)
RUN npm run build

# --- Etapa 2: Servidor Web Nginx de Producción ---
FROM nginx:alpine AS runner

# Copiar configuración de Nginx con soporte para SPA y proxy SSE
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto HTTP
EXPOSE 80

# Iniciar servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
