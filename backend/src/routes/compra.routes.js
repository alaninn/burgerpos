const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const compraController = require('../controllers/compra.controller');

// Todas las rutas requieren autenticación y verificación de pertenencia al negocio
router.use(protect, perteneceAlNegocio);

router.get('/', compraController.listar);
router.get('/:id', compraController.obtener);
router.post('/', compraController.crear);
router.put('/:id', compraController.actualizar);
router.delete('/:id', compraController.eliminar);

module.exports = router;
