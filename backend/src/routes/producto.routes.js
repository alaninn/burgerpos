const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/producto.controller');
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { checkLimit } = require('../middleware/checkPlan');

router.use(protect, perteneceAlNegocio);
router.get('/categorias', ctrl.listarCategorias);
router.post('/categorias', checkLimit('categorias'), ctrl.crearCategoria);
router.put('/categorias/:catId', ctrl.actualizarCategoria);
router.delete('/categorias/:catId', ctrl.eliminarCategoria);
router.get('/', ctrl.listar);
router.post('/', checkLimit('productos'), ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
