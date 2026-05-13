const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/mercadoPagoOAuth.controller');

// Rutas protegidas (requieren autenticación)
router.get('/authorize', protect, ctrl.iniciarOAuth);
router.get('/status', protect, ctrl.getEstadoVinculacion);
router.post('/unlink', protect, ctrl.desvincularCuenta);

// Callback público (MercadoPago redirige aquí sin autenticación)
router.get('/callback', ctrl.callbackOAuth);

module.exports = router;
