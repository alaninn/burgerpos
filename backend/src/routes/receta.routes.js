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

// Recetas especiales: combinan productos de stock para crear un nuevo
// producto intermedio (ej: una salsa) que puede usarse como ingrediente de
// otras recetas. Van antes de /:recetaId porque "especiales" no es un id.
router.post('/especiales', recetaController.crearEspecial);
router.put('/especiales/:recetaId', recetaController.actualizarEspecial);

// POST /api/negocios/:negocioId/recetas/:recetaId/preparar - Preparar un lote
// de una receta especial (consume ingredientes, suma stock del resultado)
router.post('/:recetaId/preparar', recetaController.prepararLote);

// GET /api/negocios/:negocioId/recetas/:recetaId - Obtener una receta específica
router.get('/:recetaId', recetaController.obtener);

// PUT /api/negocios/:negocioId/recetas/:recetaId - Actualizar receta
router.put('/:recetaId', recetaController.actualizar);

// DELETE /api/negocios/:negocioId/recetas/:recetaId - Eliminar receta
router.delete('/:recetaId', recetaController.eliminar);

// GET /api/negocios/:negocioId/recetas/:recetaId/costo - Calcular costo de receta
router.get('/:recetaId/costo', recetaController.calcularCosto);

module.exports = router;
