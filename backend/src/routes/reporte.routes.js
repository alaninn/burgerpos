const router = require('express').Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkAcceso } = require('../middleware/checkPlan');
const { resumen, exportar, tendencia, productos, clientes, repartidores } = require('../controllers/reporte.controller');

router.use(protect, perteneceAlNegocio);
// El resumen (dashboard) esta disponible en todos los planes
router.get('/', resumen);
router.get('/resumen', resumen);
// Los reportes avanzados requieren plan con acceso
router.get('/export', checkAcceso('reportesAvanzados'), exportar);
router.get('/tendencia', checkAcceso('reportesAvanzados'), tendencia);
router.get('/productos', checkAcceso('reportesAvanzados'), productos);
router.get('/clientes', checkAcceso('reportesAvanzados'), clientes);
router.get('/repartidores', checkAcceso('reportesAvanzados'), repartidores);

module.exports = router;
