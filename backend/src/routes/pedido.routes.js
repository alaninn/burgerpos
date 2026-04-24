const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/pedido.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');

router.use(protect, perteneceAlNegocio);
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.put('/:id/completo', ctrl.actualizarCompleto);
router.patch('/:id/estado', ctrl.actualizarEstado);

module.exports = router;
