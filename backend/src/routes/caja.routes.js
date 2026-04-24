const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/caja.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');

router.use(protect, perteneceAlNegocio);
router.get('/actual', ctrl.actual);
router.post('/abrir', ctrl.abrir);
router.get('/', ctrl.listar);
router.patch('/:id/cerrar', ctrl.cerrar);

module.exports = router;
