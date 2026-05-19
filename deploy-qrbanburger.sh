#!/bin/bash
# Script de deploy para qrbanburger.com.ar
# Ejecutar en el servidor: bash deploy-qrbanburger.sh

echo "🚀 Iniciando deploy de qrbanburger.com.ar..."

# 1. Actualizar código
echo "📦 Actualizando código desde GitHub..."
cd /root/burgerpos/burgerpos
git pull origin main

# 2. Rebuild frontend
echo "🔨 Compilando frontend..."
cd frontend
npm run build
cd ..

# 3. Reiniciar backend
echo "🔄 Reiniciando backend..."
pm2 restart burgerpos

# 4. Configurar nginx
if [ ! -f /etc/nginx/sites-available/qrbanburger ]; then
    echo "⚙️  Configurando nginx..."

    # Verificar si existe certificado SSL
    if [ -f /etc/letsencrypt/live/qrbanburger.com.ar/fullchain.pem ]; then
        echo "✅ Usando configuración con SSL"
        cp nginx-qrbanburger.conf /etc/nginx/sites-available/qrbanburger
    else
        echo "⚠️  SSL no disponible, usando HTTP temporal"
        cp nginx-qrbanburger-http.conf /etc/nginx/sites-available/qrbanburger
    fi

    # Crear symlink si no existe
    if [ ! -L /etc/nginx/sites-enabled/qrbanburger ]; then
        ln -s /etc/nginx/sites-available/qrbanburger /etc/nginx/sites-enabled/
    fi

    # Verificar configuración
    nginx -t

    # Iniciar o recargar nginx
    if systemctl is-active --quiet nginx; then
        echo "🔄 Recargando nginx..."
        systemctl reload nginx
    else
        echo "▶️  Iniciando nginx..."
        systemctl start nginx
        systemctl enable nginx
    fi
else
    echo "✅ Configuración nginx ya existe"

    # Asegurar que nginx está corriendo
    if ! systemctl is-active --quiet nginx; then
        echo "▶️  Iniciando nginx..."
        systemctl start nginx
    fi
fi

echo ""
echo "✅ Deploy completado!"
echo ""
if [ -f /etc/letsencrypt/live/qrbanburger.com.ar/fullchain.pem ]; then
    echo "🌐 Verificar en: https://qrbanburger.com.ar/menu"
else
    echo "🌐 Verificar en: http://qrbanburger.com.ar/menu"
    echo ""
    echo "⚠️  Para obtener SSL cuando el DNS se propague:"
    echo "   bash setup-ssl-qrbanburger.sh"
fi
echo "📊 Ver logs: pm2 logs burgerpos"
