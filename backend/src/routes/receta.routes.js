const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkAcceso } = require('../middleware/checkPlan');
const recetaController = require('../controllers/receta.controller');

// Todas las rutas requieren autenticación y verificación de pertenencia al negocio
router.use(protect, perteneceAlNegocio, checkAcceso('stock'));

// GET /api/negocios/:negocioId/recetas - Listar todas las recetas
router.get('/', recetaController.listar);

// POST /api/negocios/:negocioId/recetas - Crear nueva receta
router.post('/', recetaController.crear);

// GET /api/negocios/:negocioId/recetas/:recetaId - Obtener una receta específica
router.get('/:recetaId', recetaController.obtener);

// PUT /api/negocios/:negocioId/recetas/:recetaId - Actualizar receta
router.put('/:recetaId', recetaController.actualizar);

// DELETE /api/negocios/:negocioId/recetas/:recetaId - Eliminar receta
router.delete('/:recetaId', recetaController.eliminar);

// GET /api/negocios/:negocioId/recetas/:recetaId/costo - Calcular costo de receta
router.get('/:recetaId/costo', recetaController.calcularCosto);

module.exports = router;
