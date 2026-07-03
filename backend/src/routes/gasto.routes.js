const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkAcceso } = require('../middleware/checkPlan');
const gastoController = require('../controllers/gasto.controller');

// Todas las rutas requieren autenticación y verificación de pertenencia al negocio
router.use(protect, perteneceAlNegocio, checkAcceso('stock'));

router.get('/', gastoController.listar);
router.get('/resumen', gastoController.resumen);
router.post('/', gastoController.crear);
router.put('/:id', gastoController.actualizar);
router.delete('/:id', gastoController.eliminar);

module.exports = router;
