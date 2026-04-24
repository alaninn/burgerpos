const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/adicional.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');

router.use(protect, perteneceAlNegocio);

// Grupos de adicionales
// Adicionales por producto — van PRIMERO para no colisionar con /:grupoId
router.get('/producto/:productoId',                 ctrl.gruposPorProducto);
router.put('/producto/:productoId/asignar',         ctrl.asignarGrupos);

// Grupos de adicionales
router.get('/',                                     ctrl.listarGrupos);
router.post('/',                                    ctrl.crearGrupo);
router.put('/:grupoId',                             ctrl.actualizarGrupo);
router.delete('/:grupoId',                          ctrl.eliminarGrupo);

module.exports = router;
