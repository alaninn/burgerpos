const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

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
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:5173'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir uploads estáticos
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Pasar io a las rutas
app.use((req, res, next) => { req.io = io; next(); });

// WhatsApp Service
const whatsappService = require('./services/whatsappService');

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
app.use('/api/usuarios',     require('./routes/usuario.routes'));
app.use('/api/pagos',        require('./routes/pago.routes'));
app.use('/api/mercadopago/oauth', require('./routes/mercadoPagoOAuth.routes'));
app.use('/api/platform-config', require('./routes/platformConfig.routes'));

// WhatsApp Endpoints
app.get('/api/whatsapp/status', (req, res) => {
  res.json(whatsappService.getStatus());
});

app.get('/api/whatsapp/qr', async (req, res) => {
  const qr = await whatsappService.getQrCode();
  res.json(qr);
});

app.get('/api/whatsapp/templates', (req, res) => {
  res.json(whatsappService.templates);
});

app.post('/api/whatsapp/templates', (req, res) => {
  whatsappService.saveTemplates(req.body);
  res.json({ success: true });
});

// ✅ ENDPOINT TEST PARA PROBAR ENVIO DE MENSAJES
app.post('/api/whatsapp/test', async (req, res) => {
  const { number, message } = req.body;
  console.log('🔍 Probando envio de mensaje a:', number);
  const result = await whatsappService.sendMessage(number, message || '✅ Prueba de mensaje desde BurgerPOS');
  console.log('🔍 Resultado del envio:', result);
  res.json({ success: result });
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
  const success = await whatsappService.disconnect();
  res.json({ success });
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { number, message } = req.body;
  const success = await whatsappService.sendMessage(number, message);
  res.json({ success });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

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
  })
  .catch(err => {
    console.error('❌ Error conectando DB:', err);
    process.exit(1);
  });