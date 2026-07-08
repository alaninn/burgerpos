const express = require('express');
const router = express.Router({ mergeParams: true });
const pedidoFacturaController = require('../controllers/pedidoFactura.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkAcceso } = require('../middleware/checkPlan');

// Todas las rutas requieren autenticación y que el usuario pertenezca al negocio
router.use(protect, perteneceAlNegocio, checkAcceso('fiscal'));

// Emitir factura desde pedido
router.post('/:pedidoId/emitir-factura', pedidoFacturaController.emitirFacturaDesdePedido);

// Obtener comprobante del pedido
router.get('/:pedidoId/comprobante', pedidoFacturaController.obtenerComprobanteDelPedido);

// Anular comprobante (emitir Nota de Crédito)
router.post('/:pedidoId/anular-comprobante', pedidoFacturaController.anularComprobante);

module.exports = router;
