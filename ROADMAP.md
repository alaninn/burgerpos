# BurgerPOS — Roadmap y estado del proyecto

## Stack técnico
- **Frontend:** React 19 + Vite + Tailwind CSS v4 + React Router v7 + Axios + Socket.io-client + React Hot Toast + Lucide React
- **Backend:** Node.js + Express + PostgreSQL + Sequelize ORM + Socket.io + JWT
- **Paths:**
  - Frontend: `frontend/src/`
  - Backend: `backend/src/`
- **Dev:** `npm run dev` en ambas carpetas
- **Seed DB:** `node src/scripts/seed.js` desde `backend/`
- **Superadmin:** `admin@burgerpos.com` / `admin123`
- **Color primario:** violet (`#7c3aed`)

---

## Estado actual (completado)

### Backend
- [x] Auth JWT con roles: `superadmin`, `admin`, `operador`
- [x] Modelos: Usuario, Negocio, Categoria, Producto, Cliente, Repartidor, Pedido, ItemPedido, **Caja**, **Descuento**
- [x] Controllers completos con respuestas nombradas (`{ pedidos }`, `{ productos }`, etc.)
- [x] Rutas: auth, negocios, pedidos, productos, categorias, clientes, repartidores, reportes, usuarios (por negocio), cajas, descuentos
- [x] **Ruta pública** `GET /api/menu/:slug` + `POST /api/menu/:slug/pedido`
- [x] Socket.io: emit `nuevo-pedido` y `pedido-actualizado` a sala `negocio-{id}`
- [x] Seed crea superadmin y todas las tablas

### Frontend — Admin
- [x] AdminLayout con sidebar 13 items (igual a Pedisy)
- [x] **Dashboard** — KPIs reales del día (facturación, pedidos, métodos pago) + tabla últimos pedidos
- [x] PanelPedidos — Kanban 3 columnas, filtro modalidad, NuevoPedidoModal (2 pasos), OtrosPedidosModal
- [x] Pedidos — Historial con filtros fecha/modalidad/estado/método pago
- [x] Menu — Categorías + Productos CRUD completo
- [x] Repartidores — Cards con stats, CRUD
- [x] Clientes — Tabla con búsqueda, CRUD
- [x] Reportes — DonutCharts + desglose por modalidad/método pago
- [x] Configuraciones — 7 tabs + botón "Copiar link del menú" + link "Ver menú"
- [x] Fiscal — Página ARCA (stub visual)
- [x] **Stock** — Tabla de inventario con update inline, alertas stock bajo/sin stock, toggle activo
- [x] **Descuentos** — CRUD de cupones con código, tipo (% o $), usos, vencimiento
- [x] **Usuarios** — CRUD de operadores del negocio con cambio de contraseña
- [x] **Cajas** — Apertura/cierre con saldo inicial, cálculo automático, diferencia, historial
- [x] **Monitor Cocina** — KDS 3 columnas con modo pantalla completa, timer por pedido

### Frontend — SuperAdmin
- [x] SuperAdminLayout sidebar oscuro
- [x] Dashboard superadmin
- [x] Negocios — Tabla + Modal crear negocio + admin usuario
- [x] Planes

### Frontend — Público
- [x] Landing page completa (hero, features, pricing, FAQ, chatbot mini, WhatsApp)
- [x] Login
- [x] **Menú QR** `/menu/:slug` — categorías, búsqueda, carrito, pedido en 3 pasos, confirmación

---

## ✅ Fase 2 — COMPLETADA (páginas stub implementadas)

## Fase 3 — SIGUIENTE PRIORIDAD

### 1. Dashboard (conectar datos reales)
**Archivo:** `frontend/src/pages/admin/Dashboard.jsx`
- Llamar `GET /negocios/:id/reportes?fechaDesde=hoy&fechaHasta=hoy`
- Mostrar: pedidos hoy, facturación hoy, ticket promedio, pedidos por estado
- Mostrar últimos 5 pedidos del día
- Cards con comparación vs ayer (opcional)

### 2. Stock
**Archivos:** `frontend/src/pages/admin/Stock.jsx`
- Tabla de productos con columna "Stock actual"
- Input inline para actualizar stock de cada producto
- Filtros: categoría, stock bajo (< 5), sin stock
- El campo `stock` ya existe en el modelo `Producto`
- Endpoint: `PUT /negocios/:id/productos/:id` (ya existe) con `{ stock: número }`

### 3. Usuarios del negocio
**Archivos:** `frontend/src/pages/admin/Usuarios.jsx`
- CRUD de usuarios del negocio (rol: operador)
- Tabla: nombre, email, rol, activo
- Modal crear/editar usuario
- **Backend necesario:** `GET/POST/PUT/DELETE /api/negocios/:id/usuarios`
- Ruta ya existe en `usuario.routes.js` pero revisar si tiene el controller completo
- Modelo `Usuario` ya existe

### 4. Cajas
**Archivos:** `frontend/src/pages/admin/Cajas.jsx`
- **Backend necesario:** Nuevo modelo `Caja`
  ```js
  { negocioId, usuarioId, estado: ENUM('abierta','cerrada'), 
    saldoInicial, totalEfectivo, totalTarjeta, totalTransferencia,
    totalVentas, diferencia, notas, aperturaAt, cierreAt }
  ```
- Frontend: ver caja actual (abierta/cerrada), botón abrir/cerrar, historial de cajas
- Agregar rutas: `GET/POST/PATCH /api/negocios/:id/cajas`

### 5. Monitor de Cocina (KDS)
**Archivos:** `frontend/src/pages/admin/MonitorCocina.jsx`
- Vista de pantalla grande para la cocina
- Pedidos en estado `nuevo` y `en_preparacion` en 2 columnas
- Botón grande para pasar a siguiente estado
- Se actualiza en tiempo real via Socket.io (ya está configurado en backend)
- Conectar Socket.io en frontend: `import { io } from 'socket.io-client'`

### 6. Descuentos / Cupones
**Archivos:** `frontend/src/pages/admin/Descuentos.jsx`
- **Backend necesario:** Nuevo modelo `Descuento`
  ```js
  { negocioId, codigo, tipo: ENUM('porcentaje','fijo'), valor, 
    activo, usosMax, usosActuales, fechaVencimiento, minimoCompra }
  ```
- Frontend: tabla de cupones, modal crear/editar, toggle activo/inactivo
- Agregar rutas: `GET/POST/PUT/DELETE /api/negocios/:id/descuentos`

---

## Fase 3 — Menú público QR (PRIORIDAD ALTA para el negocio)

### QR Menu
- Ruta pública: `GET /api/menu/:slug` — devuelve categorías + productos activos del negocio
- Frontend route: `/menu/:slug` (sin login, sin layout admin)
- Página: categorías en tabs, productos en grid con imagen/precio
- Carrito flotante, modal pedido (nombre, dirección si delivery, método pago)
- Submit: `POST /api/menu/:slug/pedido` — crea pedido y notifica via Socket.io
- QR generado en Configuraciones apuntando a `https://tudominio.com/menu/slug`

---

## Fase 4 — Mejoras y producción

### Upload de imágenes
- Instalar `multer` en backend
- Guardar en `backend/public/uploads/`
- Servir estático desde Express
- En Menu.jsx: botón real para subir imagen de producto/categoría

### Conexión Socket.io en frontend
- En PanelPedidos y MonitorCocina: conectar socket para recibir `nuevo-pedido` y `pedido-actualizado` en tiempo real
- Sin polling, actualización instantánea

### Exportación de reportes
- Instalar `xlsx` en backend
- Endpoint: `GET /api/negocios/:id/reportes/export?format=xlsx`
- Botón "Exportar" en Reportes.jsx ya está (sin funcionalidad aún)

### Deploy
- Frontend: Vercel o Netlify (build: `npm run build`)
- Backend: Railway, Render o VPS (PM2 + Nginx)
- DB: Neon.tech (PostgreSQL serverless) o Supabase
- Variables de entorno: ver `backend/.env`

---

## Fase 5 — SaaS y monetización

### Planes
- Modelo `Plan` con límites: max_negocios, max_usuarios, funciones habilitadas
- Middleware que verifica el plan del negocio antes de ciertos endpoints
- Página de Planes en superadmin ya existe (stub)

### Onboarding
- Wizard de 3 pasos al crear negocio: datos → menú inicial → horarios
- Email de bienvenida con credenciales

### Métricas SaaS
- Dashboard superadmin con MRR, churn, negocios activos, pedidos globales
- Gráfico de crecimiento mensual

---

## Errores conocidos / pendientes

1. ~~Dashboard.jsx muestra `—` en todas las métricas~~ ✅ RESUELTO
2. ~~Socket.io no conectado en frontend~~ ✅ RESUELTO — hook useSocket.js
3. ~~Imágenes de productos no se pueden subir~~ ✅ RESUELTO — multer + /api/upload
4. ~~Clientes._count.pedidos siempre 0~~ ✅ RESUELTO — fn('COUNT') en controller
5. Fiscal (ARCA) es 100% visual, sin integración real
6. Build split en 3 chunks (vendor/socket/app) — sin warnings de tamaño

---

## Convenciones de código

- **Respuestas backend siempre:** `{ success: true, [entidad]: data }` o `{ success: false, message: '...' }`
- **Frontend axios:** `api.get(url).then(({ data }) => data.entidad || [])` con fallback a `[]`
- **Colores:** violet-600 primary, gray-900 dark, gray-50 backgrounds
- **Componentes:** modales con `fixed inset-0 bg-black/40 z-50`, centrados con `flex items-center justify-center`
- **Rutas nested:** Express routers con `mergeParams: true`
- **Tailwind v4:** usar `@import "tailwindcss"` en index.css, no `@tailwind base/components/utilities`
