# Guía de Despliegue: Módulo de Gestión Mejorado

## ✅ Cambios Implementados

### Backend
1. **Nuevas columnas en base de datos:**
   - `categorias.tipo` (ENUM: 'menu', 'stock')
   - `compras.tipoFactura` (ENUM: 'A', 'B', 'X')

2. **Migraciones creadas:**
   - `20260607_add_tipo_to_categorias.js`
   - `20260607_add_tipo_factura_to_compras.js`

3. **Modelos actualizados:**
   - Categoria.js - campo `tipo`
   - Compra.js - campo `tipoFactura`

4. **Controllers actualizados:**
   - compra.controller.js - soporte para `tipoFactura` y vinculación con gastos existentes via `gastoId`

### Frontend
1. **Stock.jsx:**
   - Filtra solo productos de categorías tipo='stock'
   - Botón "Nuevo Producto" con modal
   - Mensaje si no hay productos de stock

2. **Compras.jsx:**
   - Campo "Tipo Factura" (A, B, X)
   - Muestra tipo de factura en listado

3. **GastosDiarios.jsx:**
   - Columna "Compra" con botón "Convertir a Compra"
   - Badge "Vinculado" para gastos con compraId

4. **Nuevos componentes:**
   - ModalNuevoProducto.jsx
   - ModalConvertirCompra.jsx

## 🚀 Pasos para Desplegar en Producción (Donweb)

### 1. Verificación en Localhost

Verificá que todo funciona correctamente en localhost:

```bash
# Navegá a http://localhost:3001/login
# Iniciá sesión con: test@localhost.com / admin123

# Probá cada funcionalidad:
1. Stock -> Solo muestra ingredientes (si creaste algunos)
2. Stock -> Click "Nuevo Producto" -> Crear un producto
3. Compras -> Nueva Compra -> Ver campo "Tipo Factura"
4. Gastos Diarios -> Crear gasto de proveedor -> Ver botón "Convertir"
```

### 2. Commit y Push a Git

```bash
# En la carpeta raíz del proyecto:
cd "C:\Users\impresion3d\Desktop\programa gestion qrban 2\burgerpos"

git add .
git commit -m "feat: Mejoras al módulo de Gestión

- Agregar campo tipo a categorías (menu/stock)
- Agregar tipo de factura a compras (A, B, X)
- Stock filtra solo productos de ingredientes
- Nuevo Producto desde Stock
- Convertir Gastos a Compras
- Modal para crear productos inline

Migraciones: 20260607_add_tipo_to_categorias, 20260607_add_tipo_factura_to_compras"

git push origin main
```

### 3. Conectarse al Servidor de Producción

```bash
# Conectate por SSH a tu servidor Donweb
ssh usuario@gestionq24.ddns.net

# Navegá a la carpeta del proyecto
cd /ruta/al/proyecto/burgerpos
```

### 4. Actualizar el Código

```bash
# Pull de los cambios
git pull origin main

# Verificar que los archivos se actualizaron
ls -la backend/src/migrations/
# Deberías ver: 20260607_add_tipo_to_categorias.js y 20260607_add_tipo_factura_to_compras.js
```

### 5. Ejecutar Migraciones en Producción

**⚠️ IMPORTANTE: Hacer backup de la base de datos primero**

```bash
# Backup de la base de datos (opcional pero recomendado)
pg_dump -U usuario -d nombre_db > backup_antes_migracion_$(date +%Y%m%d_%H%M%S).sql

# Ejecutar migraciones
cd backend
npx sequelize-cli db:migrate

# Deberías ver:
# == 20260607_add_tipo_factura_to_compras: migrating =======
# == 20260607_add_tipo_factura_to_compras: migrated (0.0XXs)
# == 20260607_add_tipo_to_categorias: migrating =======
# == 20260607_add_tipo_to_categorias: migrated (0.0XXs)
```

### 6. Verificar Migraciones

```bash
# Verificar que las columnas se agregaron correctamente
psql -U usuario -d nombre_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'tipo';"

psql -U usuario -d nombre_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'compras' AND column_name = 'tipoFactura';"

# Verificar que se creó la categoría "Ingredientes"
psql -U usuario -d nombre_db -c "SELECT nombre, tipo FROM categorias WHERE tipo = 'stock';"
```

### 7. Reinstalar Dependencias y Rebuild

```bash
# Backend (si hay nuevas dependencias)
cd backend
npm install

# Frontend
cd ../frontend
npm install
npm run build
```

### 8. Reiniciar Servicios

```bash
# Usando PM2 (si usás PM2)
pm2 restart burgerpos-backend

# O reiniciá el servicio manualmente
sudo systemctl restart burgerpos
# o
sudo service burgerpos restart
```

### 9. Verificar en Producción

```bash
# Verificá los logs para asegurarte de que no hay errores
pm2 logs burgerpos-backend --lines 50

# O
tail -f /var/log/burgerpos/error.log
```

Luego navegá a tu URL de producción:
```
https://tudominio.com/login
```

Verificá:
1. Login funciona
2. Stock muestra solo ingredientes
3. Botón "Nuevo Producto" funciona
4. Compras muestra campo "Tipo Factura"
5. Gastos muestra botón "Convertir"

## 🔄 Rollback (Si algo sale mal)

Si algo no funciona en producción:

```bash
# 1. Restaurar el backup de la base de datos
psql -U usuario -d nombre_db < backup_antes_migracion_YYYYMMDD_HHMMSS.sql

# 2. Revertir el código
git reset --hard HEAD~1
git push origin main --force

# 3. Rebuild y restart
cd frontend
npm run build
cd ../backend
pm2 restart burgerpos-backend
```

## 📝 Notas Importantes

1. **Categorías existentes**: Todas las categorías actuales se marcaron automáticamente como tipo='menu'

2. **Categoría "Ingredientes"**: Se creó automáticamente con tipo='stock' para cada negocio

3. **Gastos vinculados a Compras**: Los gastos que ya tienen `compraId` NO se pueden eliminar (protección de datos)

4. **Tipo de Factura**: Es opcional, se puede dejar en blanco

5. **Conversión Gasto → Compra**: Solo funciona para gastos con:
   - categoria = 'proveedores'
   - proveedorId no nulo
   - Sin compraId existente

## ✅ Verificación Final

Checklist de producción:

- [ ] Migraciones ejecutadas sin errores
- [ ] Columnas `categorias.tipo` y `compras.tipoFactura` existen
- [ ] Categoría "Ingredientes" tipo='stock' existe para todos los negocios
- [ ] Frontend se ve correctamente (no hay errores 404)
- [ ] Login funciona
- [ ] Stock filtra correctamente
- [ ] Compras acepta tipo de factura
- [ ] Gastos muestra botón convertir
- [ ] Logs del backend sin errores

## 🆘 Soporte

Si algo no funciona:
1. Revisá los logs del backend: `pm2 logs burgerpos-backend`
2. Revisá la consola del navegador (F12) en la pestaña Console
3. Verificá que las migraciones se ejecutaron: `npx sequelize-cli db:migrate:status`

¡Cualquier duda, consultame antes de hacer cambios en producción!
