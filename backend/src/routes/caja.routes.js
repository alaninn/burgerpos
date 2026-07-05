const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/caja.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');

router.use(protect, perteneceAlNegocio);

// Cajas fijas del local
router.get('/fijas', ctrl.listarCajasFijas);
router.post('/fijas', ctrl.crearCajaFija);
router.delete('/fijas/:id', ctrl.eliminarCajaFija);

// Turnos
router.get('/actual', ctrl.actual);
router.get('/abiertas', ctrl.abiertas);
router.post('/abrir', ctrl.abrir);
router.post('/:id/unirse', ctrl.unirse);
router.post('/:id/salir', ctrl.salir);
router.patch('/:id/cerrar', ctrl.cerrar);
router.get('/', ctrl.listar);

module.exports = router;
