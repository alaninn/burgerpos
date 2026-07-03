const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkAcceso } = require('../middleware/checkPlan');
const proveedorController = require('../controllers/proveedor.controller');

// Todas las rutas requieren autenticación y verificación de pertenencia al negocio
router.use(protect, perteneceAlNegocio, checkAcceso('stock'));

router.get('/', proveedorController.listar);
router.post('/', proveedorController.crear);
router.put('/:id', proveedorController.actualizar);
router.delete('/:id', proveedorController.eliminar);

module.exports = router;
