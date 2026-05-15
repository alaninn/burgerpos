# 🚀 Guía de Despliegue BurgerPOS en VPS DonWeb

**Sistema integrado**: Backend sirve el frontend en puerto 3004  
**Comando único**: `pm2 start ecosystem.config.js --env production`

---

## 📋 Pre-requisitos en el Servidor

Antes de empezar, verificar que el servidor Ubuntu tenga instalado:

```bash
node --version   # Debe ser 18.x o superior
npm --version    # Debe estar instalado
git --version    # Debe estar instalado
psql --version   # PostgreSQL instalado
```

Si falta PM2:
```bash
npm install -g pm2
```

---

## 🗄️ Paso 1: Configurar Base de Datos PostgreSQL

### 1.1 Crear base de datos y usuario

```bash
sudo -u postgres psql
```

Ejecutar en PostgreSQL:
```sql
CREATE DATABASE burgerpos_prod;
CREATE USER burgerpos_user WITH PASSWORD 'TuPasswordSeguro2026!';
GRANT ALL PRIVILEGES ON DATABASE burgerpos_prod TO burgerpos_user;
\c burgerpos_prod
GRANT ALL ON SCHEMA public TO burgerpos_user;
GRANT CREATE ON SCHEMA public TO burgerpos_user;
\q
```

### 1.2 Verificar conexión

```bash
psql -h localhost -U burgerpos_user -d burgerpos_prod -W
# Ingresar password cuando lo pida
# Si conecta bien, escribir \q para salir
```

**⚠️ GUARDAR CREDENCIALES:**
- DB_NAME: `burgerpos_prod`
- DB_USER: `burgerpos_user`
- DB_PASSWORD: `TuPasswordSeguro2026!`

---

## 📥 Paso 2: Clonar Repositorio

```bash
cd /burgerpos
git clone https://github.com/alaninn/burgerpos.git .

# Verificar que se clonó correctamente
ls -la
# Deberías ver: backend/, frontend/, ecosystem.config.js, etc.

git log --oneline -3
```

---

## 🔐 Paso 3: Generar Claves de Seguridad

Ejecutar los siguientes comandos y **copiar los valores generados**:

```bash
# JWT_SECRET (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ENCRYPTION_KEY (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# SESSION_SECRET (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ Copiar estos 3 valores, los necesitarás en el siguiente paso.**

---

## ⚙️ Paso 4: Configurar Variables de Entorno del Backend

```bash
cd /burgerpos/backend

# Copiar el template de producción
cp .env.production .env

# Editar el archivo
nano .env
```

**IMPORTANTE:** Reemplazar los siguientes valores en el archivo `.env`:

1. **DB_PASSWORD**: Poner el password de PostgreSQL del Paso 1
2. **JWT_SECRET**: Pegar el primer valor generado en Paso 3
3. **ENCRYPTION_KEY**: Pegar el segundo valor generado en Paso 3
4. **SESSION_SECRET**: Pegar el tercer valor generado en Paso 3
5. **URLs**: Ajustar si tienes un dominio diferente (opcional)

Guardar con `Ctrl+O`, Enter, `Ctrl+X`.

**Verificar que las claves fueron reemplazadas:**
```bash
grep "GENERAR" .env
# No debe mostrar ninguna línea (si muestra algo, falta reemplazar)
```

---

## 📦 Paso 5: Instalar Dependencias del Backend

```bash
cd /burgerpos/backend

npm install --production

# Esto puede tardar 3-5 minutos debido a Puppeteer
# Esperar hasta que termine completamente
```

---

## 🗃️ Paso 6: Ejecutar Migraciones de Base de Datos

```bash
cd /burgerpos/backend

npm run db:migrate
```

**Output esperado:**
```
== 20260503_create_arca_credentials: migrating =======
== 20260503_create_arca_credentials: migrated (0.XXXs)
== 20260503_create_comprobantes_electronicos: migrating =======
...
(Total 6 migraciones)
```

**Verificar migraciones:**
```bash
psql -h localhost -U burgerpos_user -d burgerpos_prod -W
```
```sql
SELECT * FROM "SequelizeMeta" ORDER BY name;
-- Debe mostrar 6 registros
\q
```

---

## 🎨 Paso 7: Configurar y Construir Frontend

### 7.1 Editar variables de entorno del frontend

```bash
cd /burgerpos/frontend

# Copiar template
cp .env.production .env.production.local

# Si tu servidor tiene un dominio o IP diferente, edita aquí:
nano .env.production.local
```

Ajustar las URLs si es necesario (por defecto usa `vps-5839248-x.dattaweb.com:3004`).

### 7.2 Instalar dependencias y construir

```bash
cd /burgerpos/frontend

npm install

# Construir para producción
npm run build

# Verificar que se creó la carpeta dist/
ls -la dist/
du -sh dist/
```

**El build debe crear `frontend/dist/` con todos los archivos estáticos.**

---

## 📁 Paso 8: Crear Directorios Necesarios

```bash
cd /burgerpos/backend

# Directorio para logs de PM2
mkdir -p logs

# Directorio para uploads de productos
mkdir -p public/uploads/productos

# Directorio para sesión de WhatsApp
mkdir -p whatsapp-session

# Verificar
ls -la logs/ public/uploads/ whatsapp-session/
```

---

## 🚀 Paso 9: Iniciar con PM2

```bash
cd /burgerpos

# Iniciar la aplicación
pm2 start ecosystem.config.js --env production

# Verificar estado
pm2 status

# Ver logs en tiempo real
pm2 logs burgerpos --lines 50

# Si todo está OK, configurar auto-inicio en reinicio del servidor
pm2 startup
# Copiar y ejecutar el comando que muestra

pm2 save
```

**Estado esperado:**
```
┌─────┬──────────────┬─────────┬─────────┬──────┬─────┐
│ id  │ name         │ mode    │ ↺      │ status│ cpu │
├─────┼──────────────┼─────────┼─────────┼──────┼─────┤
│ 0   │ burgerpos    │ fork    │ 0       │ online│ 0%  │
└─────┴──────────────┴─────────┴─────────┴──────┴─────┘
```

---

## ✅ Paso 10: Verificar que Funciona

### 10.1 Verificar API

```bash
curl http://localhost:3004/api/health
# Esperado: {"status":"ok"}
```

### 10.2 Verificar Frontend

```bash
curl -I http://localhost:3004/
# Esperado: HTTP/1.1 200 OK, Content-Type: text/html
```

### 10.3 Ver logs

```bash
pm2 logs burgerpos
```

Buscar:
- ✅ PostgreSQL conectado
- 🚀 Servidor en puerto 3004

### 10.4 Verificar base de datos

```bash
psql -h localhost -U burgerpos_user -d burgerpos_prod -W
```
```sql
\dt
-- Debe listar todas las tablas (usuarios, negocios, productos, etc.)

SELECT COUNT(*) FROM "SequelizeMeta";
-- Debe mostrar: 6

\q
```

---

## 🌐 Paso 11: Acceder desde el Navegador

### Opción 1: Desde el mismo servidor
```
http://localhost:3004
```

### Opción 2: Desde tu red local
```
http://66.97.35.172:3004
```

### Opción 3: Con dominio
```
http://vps-5839248-x.dattaweb.com:3004
```

**⚠️ Si no puedes acceder desde fuera del servidor:**

Verificar firewall:
```bash
# Ver puertos abiertos
sudo ufw status

# Si el puerto 3004 no está abierto:
sudo ufw allow 3004/tcp
sudo ufw reload
```

---

## 👤 Paso 12: Crear Usuario Super Admin

```bash
cd /burgerpos/backend

# Generar hash de password
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('AdminBurger2026!', 10));"

# Copiar el hash completo que empieza con $2a$10$...
```

Conectar a la base de datos:
```bash
psql -h localhost -U burgerpos_user -d burgerpos_prod -W
```

Ejecutar (reemplazar HASH_AQUI con el valor copiado):
```sql
INSERT INTO usuarios (id, nombre, email, password, rol, activo, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Super Administrador',
    'admin@burgerpos.com',
    'HASH_AQUI',
    'superadmin',
    true,
    NOW(),
    NOW()
);

-- Verificar
SELECT id, nombre, email, rol, activo FROM usuarios;

\q
```

**Credenciales para login:**
- Email: `admin@burgerpos.com`
- Password: `AdminBurger2026!`

---

## 🏪 Paso 13: Crear Primer Negocio (Opcional)

```bash
psql -h localhost -U burgerpos_user -d burgerpos_prod -W
```

```sql
INSERT INTO negocios (id, nombre, slug, descripcion, direccion, telefono, email, activo, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Demo Burger',
    'demo-burger',
    'Restaurante de demostración',
    'Dirección del restaurante',
    '+54 11 1234-5678',
    'demo@burgerpos.com',
    true,
    NOW(),
    NOW()
);

SELECT id, nombre, slug FROM negocios;

\q
```

---

## 🎉 ¡LISTO!

Tu sistema BurgerPOS está corriendo en: **http://[TU_IP]:3004**

### Acceso:
1. Abrir navegador
2. Ir a `http://66.97.35.172:3004` (ajustar con tu IP)
3. Login con `admin@burgerpos.com` / `AdminBurger2026!`

---

## 🔧 Comandos Útiles

```bash
# Ver estado de PM2
pm2 status

# Ver logs en tiempo real
pm2 logs burgerpos

# Reiniciar aplicación
pm2 restart burgerpos

# Detener aplicación
pm2 stop burgerpos

# Ver información detallada
pm2 info burgerpos

# Ver uso de recursos
pm2 monit

# Actualizar código desde GitHub
cd /burgerpos
git pull origin main
cd backend && npm install --production && npm run db:migrate
cd ../frontend && npm install && npm run build
cd ..
pm2 restart burgerpos
```

---

## 🐛 Troubleshooting

### Error: Cannot find module

```bash
cd /burgerpos/backend
npm install --production
pm2 restart burgerpos
```

### Error de conexión a base de datos

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar credenciales en .env
cat /burgerpos/backend/.env | grep ^DB_

# Probar conexión manual
psql -h localhost -U burgerpos_user -d burgerpos_prod -W
```

### Frontend muestra página en blanco

```bash
# Verificar que se construyó el frontend
ls -la /burgerpos/frontend/dist/

# Verificar NODE_ENV
pm2 env burgerpos | grep NODE_ENV
# Debe mostrar: NODE_ENV=production

# Reconstruir frontend
cd /burgerpos/frontend
rm -rf dist node_modules
npm install
npm run build

# Reiniciar PM2
pm2 restart burgerpos
```

### Puerto 3004 ocupado

```bash
# Ver qué proceso usa el puerto
sudo netstat -tulpn | grep :3004

# O con lsof
sudo lsof -i :3004

# Detener PM2 y cambiar puerto en ecosystem.config.js
pm2 stop burgerpos
nano /burgerpos/ecosystem.config.js
# Cambiar PORT a otro número (ej: 3005)
# También actualizar backend/.env y frontend/.env.production
pm2 start /burgerpos/ecosystem.config.js --env production
```

### WhatsApp no conecta

Ver Paso 14 (opcional) en la documentación principal.

---

## 📊 Monitoreo

Ver logs en tiempo real:
```bash
pm2 logs burgerpos
```

Ver recursos:
```bash
pm2 monit
```

Ver información del proceso:
```bash
pm2 info burgerpos
```

---

## 🔒 Seguridad Post-Deployment

1. **Cambiar passwords por defecto**
   - Password de super admin
   - Password de base de datos
   - Todas las claves en `.env`

2. **Configurar firewall**
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 3004/tcp # BurgerPOS
   sudo ufw enable
   ```

3. **Backups regulares**
   ```bash
   # Backup de base de datos
   pg_dump -h localhost -U burgerpos_user burgerpos_prod | gzip > backup_$(date +%Y%m%d).sql.gz
   ```

---

## 📝 Notas Importantes

- ✅ Backend sirve el frontend automáticamente (puerto 3004)
- ✅ Un solo comando PM2 para todo: `pm2 start ecosystem.config.js --env production`
- ✅ El backend debe tener `NODE_ENV=production` para servir archivos estáticos
- ✅ Frontend debe estar construido (`npm run build`) antes de iniciar PM2
- ⚠️ **SIEMPRE** editar `.env` con credenciales reales antes de iniciar
- ⚠️ **NUNCA** subir archivos `.env` a GitHub (ya están en `.gitignore`)

---

## 🆘 Soporte

- **Documentación completa**: `/burgerpos/DESPLIEGUE_DONWEB.md`
- **GitHub**: https://github.com/alaninn/burgerpos
- **Logs**: `pm2 logs burgerpos`
