# Configuración del Dominio qrbanburger.com.ar

## Arquitectura Multi-Dominio

Este sistema soporta múltiples dominios apuntando al mismo servidor:
- **burgerpos.gestionq24.store**: Sistema multi-tenant (mantiene configuración actual)
- **qrbanburger.com.ar**: Dominio específico para QRBan Burger

## Cambios realizados

### 1. Detección automática de dominio

El frontend ahora detecta el hostname y usa el slug apropiado:
- Si el dominio contiene "qrbanburger.com" → usa slug "qrban" por defecto
- Otros dominios → requieren slug en la URL (comportamiento normal)

**NO se modifican** los archivos `.env.production` para mantener compatibilidad con el dominio actual.

### 2. Rutas actualizadas

- `https://qrbanburger.com.ar` → Landing page / Login
- `https://qrbanburger.com.ar/menu` → Menú público (usa slug por defecto: "qrban")
- `https://qrbanburger.com.ar/menu/:slug` → Menú público de un negocio específico
- `https://qrbanburger.com.ar/admin` → Panel de administración

## Configuración del servidor (nginx)

### Agregar nuevo dominio al servidor existente

Ya tienes `burgerpos.gestionq24.store` funcionando. Ahora agregaremos `qrbanburger.com.ar` como alias que apunta al mismo backend.

**Opción A: Modificar configuración existente (más simple)**

Editar `/etc/nginx/sites-available/burgerpos` y agregar el nuevo dominio:

```nginx
server {
    listen 80;
    listen [::]:80;
    # Agregar el nuevo dominio aquí
    server_name burgerpos.gestionq24.store qrbanburger.com.ar www.qrbanburger.com.ar;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    # Agregar el nuevo dominio aquí también
    server_name burgerpos.gestionq24.store qrbanburger.com.ar www.qrbanburger.com.ar;

    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/qrbanburger.com.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qrbanburger.com.ar/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Tamaño máximo de carga para imágenes de productos
    client_max_body_size 10M;

    # Proxy al backend Node.js (puerto 3004)
    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts para WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Socket.IO específico
    location /socket.io/ {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/qrbanburger_access.log;
    error_log /var/log/nginx/qrbanburger_error.log;
}
```

**Opción B: Archivo separado (si prefieres mantener configuraciones separadas)**

Crear `/etc/nginx/sites-available/qrbanburger`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name qrbanburger.com.ar www.qrbanburger.com.ar;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name qrbanburger.com.ar www.qrbanburger.com.ar;

    ssl_certificate /etc/letsencrypt/live/qrbanburger.com.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qrbanburger.com.ar/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    client_max_body_size 10M;

    # Proxy al mismo backend que burgerpos.gestionq24.store
    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Luego activar:
```bash
ln -s /etc/nginx/sites-available/qrbanburger /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Pasos de despliegue

### 1. Actualizar CORS en el backend

Editar `backend/.env.production` y agregar el nuevo dominio a CORS_ORIGIN:

```bash
nano /root/burgerpos/burgerpos/backend/.env.production
```

Modificar la línea CORS_ORIGIN para incluir ambos dominios:
```env
CORS_ORIGIN=http://vps-5839248-x.dattaweb.com:3004,https://burgerpos.gestionq24.store,https://qrbanburger.com.ar,http://localhost:3004
```

### 2. Actualizar código desde GitHub

```bash
# Conectar por SSH
ssh -p5041 root@66.97.35.172

# Ir al directorio del proyecto
cd /root/burgerpos/burgerpos

# Pull de los cambios
git pull origin main

# Rebuild del frontend (incluye detección de dominio)
cd frontend
npm run build
cd ..

# Reiniciar el servicio
pm2 restart burgerpos

# Verificar logs
pm2 logs burgerpos
```

### 2. Configurar SSL con Let's Encrypt

```bash
# Instalar certbot si no está instalado
apt update
apt install certbot python3-certbot-nginx

# Detener nginx temporalmente
systemctl stop nginx

# Obtener certificado
certbot certonly --standalone -d qrbanburger.com.ar -d www.qrbanburger.com.ar

# Crear configuración nginx
nano /etc/nginx/sites-available/qrbanburger

# Copiar la configuración de arriba (Opción 1 o 2)

# Crear symlink
ln -s /etc/nginx/sites-available/qrbanburger /etc/nginx/sites-enabled/

# Verificar configuración
nginx -t

# Reiniciar nginx
systemctl restart nginx

# Auto-renovación del certificado (ya configurado generalmente)
certbot renew --dry-run
```

### 3. Configurar DNS

En el panel de tu proveedor de dominio (DonWeb u otro):

```
Tipo: A
Nombre: @
Valor: 66.97.35.172
TTL: 3600

Tipo: A
Nombre: www
Valor: 66.97.35.172
TTL: 3600
```

## Verificación

Después del despliegue, verificar:

1. ✅ `https://qrbanburger.com.ar` → Muestra landing page/login
2. ✅ `https://qrbanburger.com.ar/menu` → Muestra menú público del negocio por defecto
3. ✅ `https://qrbanburger.com.ar/admin` → Panel de administración
4. ✅ Certificado SSL válido (candado verde en el navegador)
5. ✅ WebSocket funcionando (notificaciones en tiempo real)
6. ✅ Imágenes cargando correctamente

## Notas importantes

- **VITE_DEFAULT_MENU_SLUG**: Debe coincidir con el slug real del negocio en la base de datos
- **SSL**: Renovación automática configurada con certbot
- **Firewall**: Asegurar que los puertos 80 y 443 estén abiertos
- **PM2**: Configurado para reinicio automático en caso de crash

## Troubleshooting

### Error: "Cannot GET /menu"
- Verificar que el frontend esté compilado: `cd frontend && npm run build`
- Verificar configuración nginx

### Error: "API connection failed"
- Verificar que backend esté corriendo: `pm2 status`
- Verificar variables VITE_API_URL y VITE_WS_URL

### Error: "Negocio no encontrado"
- Verificar que VITE_DEFAULT_MENU_SLUG coincida con un slug existente en DB
- Query SQL: `SELECT slug FROM negocios;`
