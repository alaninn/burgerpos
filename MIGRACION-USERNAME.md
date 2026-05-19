# Migración: Sistema de Autenticación con Username

## Cambios realizados

- ✅ Sistema de login cambiado de **email** a **username**
- ✅ Frontend actualizado con campo "Usuario" en lugar de "Email"
- ✅ Backend actualizado para autenticar por username
- ✅ Modelo Usuario modificado (username es único y requerido, email ahora opcional)

## Nuevas credenciales

| Usuario      | Contraseña | Rol        |
|--------------|------------|------------|
| superadmin   | 21129021   | superadmin |
| qrbanburger  | 21129021   | admin      |

## Pasos para aplicar en producción

### 1. En el servidor (VPS)

```bash
# Conectar al VPS
ssh -p5041 root@66.97.35.172

# Ir al directorio del proyecto
cd /root/burgerpos/burgerpos

# Hacer backup de la base de datos (IMPORTANTE)
pg_dump -U burgerpos_user burgerpos_db > backup_antes_username_$(date +%Y%m%d_%H%M%S).sql

# Traer los cambios
git pull origin main

# Aplicar migración SQL
psql -U burgerpos_user -d burgerpos_db -f backend/migrations/add-username-field.sql

# Actualizar usuarios con nuevas credenciales
cd backend && node scripts/update-users-credentials.js

# Rebuild del frontend
cd ../frontend
npm run build

# Reiniciar el backend
pm2 restart burgerpos

# Ver logs
pm2 logs burgerpos --lines 50
```

### 2. Probar el login

- Ir a: https://qrbanburger.com.ar/login
- Usuario: `superadmin` o `qrbanburger`
- Contraseña: `21129021`

## Rollback (en caso de problemas)

Si algo sale mal, restaurar el backup:

```bash
psql -U burgerpos_user -d burgerpos_db < backup_antes_username_FECHA.sql
git checkout HEAD~1  # volver al commit anterior
cd frontend && npm run build
pm2 restart burgerpos
```
