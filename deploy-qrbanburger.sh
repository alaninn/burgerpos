#!/bin/bash
# Script de deploy para qrbanburger.com.ar
# Ejecutar en el servidor: bash deploy-qrbanburger.sh

set -e  # Salir si hay errores

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

# 4. Verificar si existe certificado SSL
if [ ! -f /etc/letsencrypt/live/qrbanburger.com.ar/fullchain.pem ]; then
    echo "🔒 Generando certificado SSL..."
    systemctl stop nginx
    certbot certonly --standalone -d qrbanburger.com.ar -d www.qrbanburger.com.ar
    systemctl start nginx
else
    echo "✅ Certificado SSL ya existe"
fi

# 5. Configurar nginx si no existe
if [ ! -f /etc/nginx/sites-available/qrbanburger ]; then
    echo "⚙️  Configurando nginx..."
    cp /root/burgerpos/burgerpos/nginx-qrbanburger.conf /etc/nginx/sites-available/qrbanburger
    ln -s /etc/nginx/sites-available/qrbanburger /etc/nginx/sites-enabled/
    nginx -t
    systemctl reload nginx
else
    echo "✅ Configuración nginx ya existe"
fi

echo "✅ Deploy completado!"
echo ""
echo "🌐 Verificar en: https://qrbanburger.com.ar/menu"
echo "📊 Ver logs: pm2 logs burgerpos"
