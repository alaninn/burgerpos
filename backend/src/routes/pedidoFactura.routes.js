const express = require('express');
const router = express.Router({ mergeParams: true });
const pedidoFacturaController = require('../controllers/pedidoFactura.controller');
const { protect } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Emitir factura desde pedido
router.post('/:pedidoId/emitir-factura', pedidoFacturaController.emitirFacturaDesdePedido);

// Obtener comprobante del pedido
router.get('/:pedidoId/comprobante', pedidoFacturaController.obtenerComprobanteDelPedido);

// Anular comprobante (emitir Nota de Crédito)
router.post('/:pedidoId/anular-comprobante', pedidoFacturaController.anularComprobante);

module.exports = router;
