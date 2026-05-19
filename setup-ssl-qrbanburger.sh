#!/bin/bash
# Script para configurar SSL en qrbanburger.com.ar
# Ejecutar DESPUÉS de que el DNS se haya propagado

echo "🔒 Configurando SSL para qrbanburger.com.ar..."

# Verificar que el DNS esté propagado
echo "📡 Verificando DNS..."
DNS_IP=$(dig +short qrbanburger.com.ar | head -n1)

if [ -z "$DNS_IP" ]; then
    echo "❌ ERROR: El DNS aún no está propagado"
    echo "Esperá unas horas y volvé a intentar"
    exit 1
fi

echo "✅ DNS apunta a: $DNS_IP"

# Detener nginx temporalmente
echo "⏸️  Deteniendo nginx..."
systemctl stop nginx

# Obtener certificado SSL
echo "🔐 Obteniendo certificado SSL..."
certbot certonly --standalone -d qrbanburger.com.ar -d www.qrbanburger.com.ar

if [ $? -eq 0 ]; then
    echo "✅ Certificado SSL obtenido exitosamente"

    # Actualizar configuración nginx con SSL
    echo "⚙️  Actualizando configuración nginx..."
    cd /root/burgerpos/burgerpos
    cp nginx-qrbanburger.conf /etc/nginx/sites-available/qrbanburger

    # Verificar configuración
    nginx -t

    if [ $? -eq 0 ]; then
        # Iniciar nginx
        systemctl start nginx
        echo ""
        echo "✅ SSL configurado exitosamente!"
        echo "🌐 Verificar en: https://qrbanburger.com.ar/menu"
    else
        echo "❌ ERROR en configuración nginx"
        systemctl start nginx
        exit 1
    fi
else
    echo "❌ ERROR al obtener certificado SSL"
    echo "Iniciando nginx sin SSL..."
    systemctl start nginx
    exit 1
fi
