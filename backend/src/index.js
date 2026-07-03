const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Capturar console.log/warn/error en un buffer en memoria (visor de logs del superadmin)
require('./services/logBuffer').instalar();

const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173'];
      const allowedOrigins = process.env.FRONTEND_URL
        ? [...process.env.FRONTEND_URL.split(','), ...defaultOrigins]
        : defaultOrigins;
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:", "*.openstreetmap.org", "*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:", "https:", "http:", "assets.mixkit.co"],
      frameSrc: ["'self'"]
    }
  }
}));

// CORS solo para rutas API
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir same-origin (cuando origin es undefined/null)
    // Esto pasa cuando el frontend y backend están en el mismo dominio/puerto
    if (!origin) return callback(null, true);

    const defaultOrigins = ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'];
    const allowedOrigins = process.env.CORS_ORIGIN ? [...process.env.CORS_ORIGIN.split(','), ...defaultOrigins] : defaultOrigins;

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS: origin rechazado:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit global sobre la API (protege de abuso/fuerza bruta)
const rateLimit = require('express-rate-limit');
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, esperá unos minutos' }
}));

// Servir uploads estáticos
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Pasar io a las rutas
app.use((req, res, next) => { req.io = io; next(); });

// Aplicar CORS solo a rutas API
app.use('/api', cors(corsOptions));

// Rutas
app.use('/api/upload',   require('./routes/upload.routes'));
app.use('/api/maps',         require('./routes/maps.routes'));  // proxy geocodificación (Photon/OSM)
app.use('/api/menu',         require('./routes/menu.routes'));   // público, sin auth
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/negocios',     require('./routes/negocio.routes'));
app.use('/api/negocios/:negocioId/pedidos',      require('./routes/pedido.routes'));
app.use('/api/negocios/:negocioId/pedidos',      require('./routes/pedidoFactura.routes'));
app.use('/api/negocios/:negocioId/productos/:productoId/variantes', require('./routes/variante.routes'));
app.use('/api/negocios/:negocioId/productos',    require('./routes/producto.routes'));
app.use('/api/negocios/:negocioId/clientes',     require('./routes/cliente.routes'));
app.use('/api/negocios/:negocioId/repartidores', require('./routes/repartidor.routes'));
app.use('/api/negocios/:negocioId/reportes',     require('./routes/reporte.routes'));
app.use('/api/negocios/:negocioId/usuarios',     require('./routes/negocio-usuario.routes'));
app.use('/api/negocios/:negocioId/cajas',        require('./routes/caja.routes'));
app.use('/api/negocios/:negocioId/descuentos',   require('./routes/descuento.routes'));
app.use('/api/negocios/:negocioId/adicionales',  require('./routes/adicional.routes'));
app.use('/api/negocios/:negocioId/arca',        require('./routes/arca.routes'));
app.use('/api/negocios/:negocioId/whatsapp',    require('./routes/whatsapp.routes'));
// Módulo de Gestión
app.use('/api/negocios/:negocioId/proveedores', require('./routes/proveedor.routes'));
app.use('/api/negocios/:negocioId/gastos',      require('./routes/gasto.routes'));
app.use('/api/negocios/:negocioId/compras',     require('./routes/compra.routes'));
app.use('/api/negocios/:negocioId/recetas',     require('./routes/receta.routes'));
app.use('/api/usuarios',     require('./routes/usuario.routes'));
app.use('/api/salud',        require('./routes/salud.routes'));       // reporte de errores frontend (público)
app.use('/api/superadmin',   require('./routes/superadminErrores.routes')); // logs y errores (solo superadmin)
app.use('/api/superadmin',   require('./routes/superadminPlataforma.routes')); // planes, finanzas, alertas, backups, tickets
app.use('/api/negocios/:negocioId/soporte', require('./routes/soporte.routes'));
app.use('/api/pagos',        require('./routes/pago.routes'));
app.use('/api/mercadopago/oauth', require('./routes/mercadoPagoOAuth.routes'));
app.use('/api/platform-config', require('./routes/platformConfig.routes'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Servir frontend en producción (debe ir después de todas las rutas API)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  // Catch-all para SPA routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// WebSocket
io.on('connection', (socket) => {
  socket.on('join-negocio', (negocioId) => socket.join(`negocio-${negocioId}`));
});

// Conectar DB y levantar servidor
sequelize.authenticate()
  .then(() => {
    console.log('✅ PostgreSQL conectado');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));

    // Tareas programadas de plataforma
    require('./services/alertasService').iniciarAlertasAutomaticas();
    require('./services/backupService').iniciarBackupsAutomaticos();
  })
  .catch(err => {
    console.error('❌ Error conectando DB:', err);
    process.exit(1);
  });