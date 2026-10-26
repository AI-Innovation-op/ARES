#!/usr/bin/env bash

# ============================================================================
# SCRIPT DE DESPLIEGUE AUTOMÁTICO EN LA NUBE: A.R.E.S. ECOSYSTEM
# Compatible con Ubuntu / Debian / CentOS / Arch / Alpine
# ============================================================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛡️  INICIANDO DESPLIEGUE EN LA NUBE DE A.R.E.S. ECOSYSTEM..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Verificar Docker y Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado en este servidor."
    echo "👉 Instala Docker con: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 2. Configurar archivo .env de producción si no existe
if [ ! -f .env ]; then
    echo "⚙️ Creando archivo .env desde plantilla..."
    cp .env.example .env
    echo "⚠️ Por favor edita el archivo .env con tus claves antes de continuar:"
    echo "   nano .env"
    exit 1
fi

# 3. Crear directorios para volúmenes persistentes
mkdir -p database

# 4. Construir y levantar contenedores en segundo plano
echo "🚀 Compilando y levantando contenedores con Docker Compose..."
docker compose pull || true
docker compose up --build -d

# 5. Esperar verificación de salud del backend
echo "⏳ Esperando confirmación de enlace táctico (Healthcheck)..."
sleep 5

for i in {1..12}; do
    if curl -s http://localhost:3000/health | grep -q "ONLINE"; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚔️  DESPLIEGUE EXITOSO: A.R.E.S. ESTÁ EN LÍNEA EN LA NUBE"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🌐 Consola Web HUD:    http://$(curl -s ifconfig.me):5173"
        echo "📡 Backend API Health: http://$(curl -s ifconfig.me):3000/health"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
    fi
    echo -n "."
    sleep 3
done

echo ""
echo "⚠️ El servidor aún está inicializando o revisando migraciones."
echo "👉 Verifica los logs con: docker compose logs -f"
