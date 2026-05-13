const router = require('express').Router();
const ctrl = require('../controllers/menu.controller');

// Rutas públicas — sin autenticación
router.get('/:slug', ctrl.obtenerMenu);
router.get('/:slug/cliente', ctrl.buscarCliente);
router.get('/:slug/descuentos-automaticos', ctrl.obtenerDescuentosAutomaticos);
router.post('/:slug/pedido', ctrl.crearPedido);
router.post('/:slug/cupon', ctrl.validarCupon);

module.exports = router;
