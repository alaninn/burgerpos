const router = require('express').Router();
const ctrl = require('../controllers/negocio.controller');
const { protect, superAdmin } = require('../middleware/auth');

router.use(protect);
router.get('/', superAdmin, ctrl.listar);
router.get('/metricas', superAdmin, ctrl.metricas);
router.post('/', superAdmin, ctrl.crear);
router.get('/:id/uso', ctrl.uso);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.patch('/:id/toggle', superAdmin, ctrl.toggleActivo);

module.exports = router;
