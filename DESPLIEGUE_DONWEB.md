# 🚀 Guía de Despliegue en DonWeb

## Requisitos Previos

- Cuenta en DonWeb con soporte para Node.js (versión 18+)
- PostgreSQL 14+ disponible
- Acceso SSH o cPanel
- Dominio configurado

## Paso 1: Configurar Base de Datos PostgreSQL

### 1.1 Crear Base de Datos
```sql
CREATE DATABASE burgerpos_prod;
CREATE USER burgerpos_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE burgerpos_prod TO burgerpos_user;
```

### 1.2 Configurar acceso remoto
Asegúrate de que DonWeb permita conexiones a PostgreSQL desde tu aplicación Node.js.

## Paso 2: Preparar Archivos Backend

### 2.1 Crear archivo `.env` en producción

En el servidor, crear el archivo `backend/.env`:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=burgerpos_prod
DB_USER=burgerpos_user
DB_PASSWORD=tu_password_seguro

# JWT
JWT_SECRET=clave_super_segura_cambiar_esto_123456789

# Puerto
PORT=3001

# URLs
CLIENT_URL=https://tu-dominio.com
API_URL=https://tu-dominio.com/api

# WhatsApp (opcional)
WHATSAPP_SESSION_PATH=./whatsapp-session

# MercadoPago (si lo usas)
MP_CLIENT_ID=tu_client_id
MP_CLIENT_SECRET=tu_client_secret

# ARCA/AFIP (si lo usas)
ARCA_ENV=production
ENCRYPTION_KEY=clave_encriptacion_32_caracteres

# Node
NODE_ENV=production
```

### 2.2 Instalar dependencias backend
```bash
cd backend
npm install --production
```

### 2.3 Ejecutar migraciones
```bash
npm run db:migrate
```

## Paso 3: Preparar Frontend para Producción

### 3.1 Configurar variables de entorno del frontend

Crear `frontend/.env.production`:

```env
VITE_API_URL=https://tu-dominio.com/api
```

### 3.2 Construir frontend
```bash
cd frontend
npm install
npm run build
```

Esto genera la carpeta `frontend/dist` con los archivos estáticos.

## Paso 4: Subir Archivos al Servidor

### Opción A: Usando cPanel (File Manager)

1. **Backend:**
   - Subir carpeta `backend/` completa
   - Crear archivo `.env` con las variables de producción
   - Asegurar que `node_modules` se instale en el servidor

2. **Frontend:**
   - Subir solo la carpeta `frontend/dist/` 
   - Configurar el dominio para servir desde esta carpeta

### Opción B: Usando FTP/SFTP

```bash
# Subir backend
scp -r backend usuario@servidor.donweb.com:/home/usuario/burgerpos/

# Subir frontend build
scp -r frontend/dist usuario@servidor.donweb.com:/var/www/html/
```

## Paso 5: Configurar Node.js en DonWeb

### Si DonWeb usa cPanel con Node.js Selector:

1. Ir a **Setup Node.js App**
2. Crear nueva aplicación:
   - **Node.js version:** 18.x o superior
   - **Application root:** `burgerpos/backend`
   - **Application URL:** tu-dominio.com/api
   - **Application startup file:** `src/index.js`
   - **Environment variables:** Copiar del archivo `.env`

3. Hacer clic en **Start** para iniciar la aplicación

### Si DonWeb usa PM2:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicación
cd /home/usuario/burgerpos/backend
pm2 start src/index.js --name burgerpos-api

# Configurar para iniciar al reiniciar el servidor
pm2 startup
pm2 save
```

## Paso 6: Configurar Servidor Web (Apache/Nginx)

### Nginx

Crear archivo `/etc/nginx/sites-available/burgerpos`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        root /var/www/html/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Activar configuración:
```bash
sudo ln -s /etc/nginx/sites-available/burgerpos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache (.htaccess)

En el directorio del frontend, crear `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# API Proxy
<IfModule mod_proxy.c>
  ProxyPass /api http://localhost:3001/api
  ProxyPassReverse /api http://localhost:3001/api
  ProxyPass /socket.io http://localhost:3001/socket.io
  ProxyPassReverse /socket.io http://localhost:3001/socket.io
</IfModule>
```

## Paso 7: Configurar SSL/HTTPS

### Usando Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

O desde cPanel: **SSL/TLS** → **Let's Encrypt SSL**

## Paso 8: Verificar Despliegue

### 8.1 Verificar Backend
```bash
curl https://tu-dominio.com/api/health
```

Debería responder: `{"status":"ok"}`

### 8.2 Verificar Frontend
Abrir en navegador: `https://tu-dominio.com`

### 8.3 Verificar Base de Datos
```bash
cd backend
npm run db:migrate
```

## Paso 9: Configuración Post-Despliegue

### 9.1 Crear usuario super admin
```bash
cd backend
node -e "
const bcrypt = require('bcryptjs');
console.log('Password hasheado:', bcrypt.hashSync('tu_password', 10));
"
```

Luego insertar en base de datos:
```sql
INSERT INTO usuarios (id, nombre, email, password, rol, activo, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Super Admin',
  'admin@tu-dominio.com',
  'hash_generado_arriba',
  'superadmin',
  true,
  NOW(),
  NOW()
);
```

### 9.2 Crear primer negocio
```sql
INSERT INTO negocios (id, nombre, slug, activo, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Mi Negocio',
  'mi-negocio',
  true,
  NOW(),
  NOW()
);
```

## Paso 10: Monitoreo y Logs

### Ver logs con PM2
```bash
pm2 logs burgerpos-api
pm2 monit
```

### Reiniciar aplicación
```bash
pm2 restart burgerpos-api
```

## Troubleshooting

### Error: Cannot connect to database
- Verificar credenciales en `.env`
- Verificar que PostgreSQL esté corriendo
- Verificar firewall del servidor

### Error: 502 Bad Gateway
- Verificar que Node.js esté corriendo: `pm2 status`
- Verificar logs: `pm2 logs`
- Reiniciar: `pm2 restart burgerpos-api`

### Frontend muestra página en blanco
- Verificar que `dist/` tenga los archivos
- Verificar console del navegador (F12)
- Verificar que `VITE_API_URL` sea correcto

### WhatsApp no conecta
- Verificar permisos de carpeta `whatsapp-session`
- Generar QR nuevamente desde el panel admin

## Comandos Útiles

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs --lines 100

# Reiniciar
pm2 restart all

# Detener
pm2 stop burgerpos-api

# Ver uso de recursos
pm2 monit

# Actualizar después de cambios
cd backend && git pull && npm install && pm2 restart burgerpos-api
cd frontend && git pull && npm run build
```

## Backups

### Base de Datos
```bash
# Crear backup
pg_dump -U burgerpos_user burgerpos_prod > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U burgerpos_user burgerpos_prod < backup_20260513.sql
```

### Archivos
```bash
# Backup carpeta uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

## Soporte DonWeb

Si necesitas ayuda específica de DonWeb:
- **Chat:** https://www.donweb.com/
- **Email:** soporte@donweb.com
- **Teléfono:** +54 11 5272-3000
- **Panel cPanel:** https://tu-servidor.donweb.com:2083

## Checklist Final

- [ ] Base de datos PostgreSQL creada y configurada
- [ ] Variables de entorno configuradas en `.env`
- [ ] Backend desplegado y corriendo
- [ ] Frontend build subido y servido
- [ ] SSL/HTTPS configurado
- [ ] Usuario super admin creado
- [ ] Primer negocio creado
- [ ] WhatsApp configurado (si aplica)
- [ ] MercadoPago configurado (si aplica)
- [ ] ARCA/AFIP configurado (si aplica)
- [ ] Backups automáticos configurados
- [ ] Monitoreo configurado

¡Listo! Tu aplicación BurgerPOS está en producción 🎉
