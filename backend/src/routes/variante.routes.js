const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/variante.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');

router.use(protect, perteneceAlNegocio);

router.get('/',                    ctrl.listar);
router.post('/',                   ctrl.crear);
router.put('/sincronizar',         ctrl.sincronizar);   // Reemplaza todas las variantes
router.put('/:varianteId',         ctrl.actualizar);
router.delete('/:varianteId',      ctrl.eliminar);

module.exports = router;
