# 🍔 BurgerPOS - Sistema de Gestión para Restaurantes

Sistema SaaS completo para gestión de pedidos, delivery, facturación electrónica y pagos online.

## ✨ Características Principales

- 📱 **Panel de Pedidos en Tiempo Real** con mapa interactivo
- 🎯 **Sistema de Descuentos Avanzado** (globales, por modalidad, cupones)
- 📄 **Facturación Electrónica AFIP/ARCA** automática
- 💳 **Pagos Online con MercadoPago** (OAuth integrado)
- 📲 **Notificaciones WhatsApp** automáticas
- 🗺️ **Mapa Personalizable** de pedidos delivery
- 🏪 **Multi-negocio** con panel de super admin
- 📊 **Reportes y Analytics** completos

## 🚀 Despliegue en Producción (DonWeb)

### Preparación Rápida

1. **Ejecutar script de preparación:**
   ```bash
   # En Windows (PowerShell)
   .\preparar-produccion.ps1
   
   # En Linux/Mac
   bash preparar-produccion.sh
   ```

2. **Configurar credenciales:**
   - Editar `backend/.env` con datos de producción
   - Editar `frontend/.env.production` con URL del dominio

3. **Subir al servidor:**
   - Archivo generado: `burgerpos-produccion-YYYYMMDD-HHMMSS.zip`
   - Ver guía completa: [DESPLIEGUE_DONWEB.md](DESPLIEGUE_DONWEB.md)

### Requisitos del Servidor

- Node.js 18+
- PostgreSQL 14+
- 2GB RAM mínimo
- SSL/HTTPS (Let's Encrypt)

## 🛠️ Desarrollo Local

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurar .env con datos locales
npm run db:migrate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Base de Datos

```bash
# Crear base de datos
createdb burgerpos_dev

# Ejecutar migraciones
cd backend
npm run db:migrate

# (Opcional) Seeds de prueba
npm run db:seed
```

## 📁 Estructura del Proyecto

```
burgerpos/
├── backend/                 # API Node.js + Express
│   ├── src/
│   │   ├── controllers/    # Controladores
│   │   ├── models/         # Modelos Sequelize
│   │   ├── routes/         # Rutas API
│   │   ├── services/       # Servicios (WhatsApp, ARCA, MP)
│   │   └── migrations/     # Migraciones DB
│   └── .env               # Variables de entorno
│
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── pages/         # Páginas
│   │   ├── components/    # Componentes reutilizables
│   │   └── context/       # Context API
│   └── dist/              # Build de producción
│
└── DESPLIEGUE_DONWEB.md   # Guía de despliegue
```

## 🔐 Seguridad

- JWT para autenticación
- Bcrypt para passwords
- Variables de entorno para secretos
- Validación de datos en backend
- CORS configurado
- Rate limiting
- SQL injection protection (Sequelize ORM)

## 📚 Documentación

- [Guía de Despliegue DonWeb](DESPLIEGUE_DONWEB.md)
- [Configuración ARCA](backend/ARCA_COMPLETADO.md)
- [Configuración MercadoPago](backend/OAUTH_MERCADOPAGO_IMPLEMENTADO.md)
- [Sistema de Descuentos](IMPLEMENTACION_DESCUENTOS_PRODUCTOS.md)

## 🤝 Soporte

Para consultas sobre el despliegue en DonWeb:
- 📧 Email: soporte@donweb.com
- 💬 Chat: https://www.donweb.com/
- 📞 Teléfono: +54 11 5272-3000

## 📝 Licencia

Proyecto desarrollado con Claude Code (Anthropic).

---

**Versión:** 1.0.0  
**Última actualización:** Mayo 2026
