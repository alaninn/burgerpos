const router = require('express').Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { resumen, exportar } = require('../controllers/reporte.controller');

router.use(protect, perteneceAlNegocio);
router.get('/', resumen);
router.get('/resumen', resumen);
router.get('/export', exportar);

module.exports = router;
