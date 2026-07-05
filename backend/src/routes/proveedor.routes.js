const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkAcceso } = require('../middleware/checkPlan');
const proveedorController = require('../controllers/proveedor.controller');

// Todas las rutas requieren autenticación y verificación de pertenencia al negocio
router.use(protect, perteneceAlNegocio, checkAcceso('stock'));

router.get('/', proveedorController.listar);
router.get('/:id', proveedorController.obtener);
router.post('/', proveedorController.crear);
router.post('/:id/pago', proveedorController.registrarPago);
router.post('/:id/productos', proveedorController.asignarProducto);
router.delete('/:id/productos/:productoId', proveedorController.quitarProducto);
router.patch('/:id/reactivar', proveedorController.reactivar);
router.put('/:id', proveedorController.actualizar);
router.delete('/:id/definitivo', proveedorController.eliminarDefinitivo);
router.delete('/:id', proveedorController.eliminar);

module.exports = router;
