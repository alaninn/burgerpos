const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/usuario.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkLimit } = require('../middleware/checkPlan');

router.use(protect, perteneceAlNegocio);
router.get('/', ctrl.listar);
router.post('/', checkLimit('operadores'), ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
