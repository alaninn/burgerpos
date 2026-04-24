# 🍔 BurgerPOS

Sistema completo de gestión de pedidos para restaurantes con integración de WhatsApp.

## 📋 Características

### 🎯 Gestión de Pedidos
- Panel de administración en tiempo real
- Estados de pedidos: Nuevo → En preparación → Listo → En camino → Entregado
- Soporte para múltiples modalidades: Delivery, Take Away, Salón
- Actualización automática vía Socket.io
- Sistema de tiempos estimados de preparación

### 📱 WhatsApp Integrado
- Envío automático de mensajes en cada cambio de estado
- Plantillas personalizables con variables dinámicas
- Soporte completo para números argentinos
- Sesión persistente (no requiere escanear QR cada vez)
- Variables disponibles: `{{tiempo_estimado}}`, `{{nombre_cliente}}`, `{{numero_pedido}}`, `{{total}}`

### 🗺️ Sistema de Mapas
- Gestión de zonas de entrega
- Visualización de pedidos en mapa
- Integración con Leaflet
- Geocodificación con TomTom, Georef y Nominatim

### 🍕 Menú Público
- Menú personalizable por QR
- Carrito de compras
- Variantes de productos
- Sistema de adicionales
- Modo oscuro/claro
- Responsive design

### 💰 Gestión Financiera
- Múltiples métodos de pago
- Sistema de descuentos
- Control de caja
- Reportes de ventas

### 👥 Gestión de Personal
- Sistema de usuarios y roles
- Gestión de repartidores
- Asignación automática de pedidos

## 🚀 Tecnologías

### Backend
- Node.js + Express
- PostgreSQL + Sequelize
- Socket.io para tiempo real
- whatsapp-web.js para integración WhatsApp
- JWT para autenticación

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router
- Axios
- React Hot Toast
- Leaflet para mapas

## 📦 Instalación

### Requisitos previos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Backend

```bash
cd backend
npm install
```

Crear archivo `.env`:

```env
PORT=3001
DATABASE_URL=postgresql://usuario:password@localhost:5432/burgerpos
JWT_SECRET=tu_secret_key_aqui
FRONTEND_URL=http://localhost:3000
```

Ejecutar migraciones:

```bash
npx sequelize-cli db:migrate
```

Iniciar servidor:

```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔧 Configuración de WhatsApp

1. Ir a Configuraciones → Integraciones
2. Click en "Vincular dispositivo WhatsApp"
3. Escanear el código QR con tu WhatsApp
4. La sesión quedará guardada para próximos inicios

## 📱 Plantillas de WhatsApp

Las plantillas soportan variables que se reemplazan automáticamente:

**Ejemplo:**
```
¡Hola {{nombre_cliente}}! 
Tu pedido #{{numero_pedido}} estará listo en {{tiempo_estimado}} minutos.
Total: ${{total}}
```

## 🗂️ Estructura del Proyecto

```
burgerpos/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── hooks/
│   └── package.json
└── README.md
```

## 🎨 Capturas de Pantalla

*(Agregar capturas de pantalla aquí)*

## 📄 Licencia

Propietario - Todos los derechos reservados

## 👨‍💻 Autor

Alan Inn - [@alaninn](https://github.com/alaninn)

---

**Version:** 1.0.0  
**Última actualización:** Abril 2026
