const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/descuento.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkAcceso } = require('../middleware/checkPlan');

router.use(protect, perteneceAlNegocio);
router.post('/validar', ctrl.validar);
router.get('/', ctrl.listar);
router.post('/', checkAcceso('descuentos'), ctrl.crear);
router.put('/:id', checkAcceso('descuentos'), ctrl.actualizar);
router.delete('/:id', checkAcceso('descuentos'), ctrl.eliminar);

module.exports = router;
