const { Producto, Categoria, ProductoVariante, GrupoAdicional, Adicional, Descuento, Receta } = require('../models');

const includeCompleto = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'tipo'] },
  { model: ProductoVariante, as: 'variantes', order: [['orden', 'ASC']], separate: true },

    { model: GrupoAdicional, as: 'gruposAdicionales',
    include: [{ model: Adicional, as: 'items', order: [['orden', 'ASC']] }]
  },
  { model: Descuento, as: 'descuento',
    attributes: ['id', 'codigo', 'tipo', 'valor', 'activo', 'descripcion'] },
  // Indica si el producto tiene receta (su costo se calcula desde los ingredientes)
  { model: Receta, as: 'receta', attributes: ['id'] }
];

exports.listar = async (req, res) => {
  try {
    const where = { negocioId: req.params.negocioId };
    if (req.query.activo !== undefined) where.activo = req.query.activo === 'true';
    if (req.query.categoriaId) where.categoriaId = req.query.categoriaId;
    const productos = await Producto.findAll({
      where,
      include: includeCompleto,
      order: [['orden', 'ASC'], ['nombre', 'ASC']]
    });
    res.json({ success: true, productos });
  } catch (err) {
    console.error('❌ Error en listar productos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const body = { ...req.body }
    if (body.precioVenta === '' || body.precioVenta === undefined) body.precioVenta = 0
    if (body.precioCosto === '' || body.precioCosto === undefined) body.precioCosto = 0
    const producto = await Producto.create({ ...body, negocioId: req.params.negocioId });
    res.status(201).json({ success: true, producto });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ success: false, message: 'No encontrado' });
    await producto.update(req.body);
    const actualizado = await Producto.findByPk(req.params.id, { include: includeCompleto });
    res.json({ success: true, producto: actualizado });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ success: false, message: 'No encontrado' });
    await producto.destroy();
    res.json({ success: true, message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.findAll({
      where: { negocioId: req.params.negocioId },
      include: [{ model: Producto, as: 'productos', required: false }],
      order: [['orden', 'ASC']]
    });
    res.json({ success: true, categorias });
  } catch (err) {
   
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crearCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.create({ ...req.body, negocioId: req.params.negocioId });
    res.status(201).json({ success: true, categoria });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actualizarCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.catId);
    if (!categoria) return res.status(404).json({ success: false, message: 'No encontrada' });
    await categoria.update(req.body);
    res.json({ success: true, categoria });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.eliminarCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.catId);
    if (!categoria) return res.status(404).json({ success: false, message: 'No encontrada' });
    await categoria.destroy();
    res.json({ success: true, message: 'Eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
