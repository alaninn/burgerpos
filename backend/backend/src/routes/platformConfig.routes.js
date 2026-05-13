const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/platformConfig.controller');

// Middleware para verificar que el usuario es superadmin
const superAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.rol === 'superadmin') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Solo superadmin.' });
  }
};

// Solo superadmin puede acceder a estas rutas
router.get('/mercadopago', protect, superAdmin, ctrl.getMercadoPagoConfig);
router.post('/mercadopago', protect, superAdmin, ctrl.saveMercadoPagoConfig);

module.exports = router;
