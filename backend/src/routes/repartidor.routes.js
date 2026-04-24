const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/repartidor.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkLimit } = require('../middleware/checkPlan');

router.use(protect, perteneceAlNegocio);
router.get('/reportes', ctrl.reportes);
router.get('/', ctrl.listar);
router.post('/', checkLimit('repartidores'), ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
