const router = require('express').Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { resumen, exportar, tendencia, productos, clientes, repartidores } = require('../controllers/reporte.controller');

router.use(protect, perteneceAlNegocio);
router.get('/', resumen);
router.get('/resumen', resumen);
router.get('/export', exportar);
router.get('/tendencia', tendencia);
router.get('/productos', productos);
router.get('/clientes', clientes);
router.get('/repartidores', repartidores);

module.exports = router;
