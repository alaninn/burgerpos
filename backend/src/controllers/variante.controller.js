const { ProductoVariante, Producto } = require('../models');

// ── Listar variantes de un producto ───────────────────────
exports.listar = async (req, res) => {
  try {
    const { negocioId, productoId } = req.params;
    // Verificar que el producto pertenece al negocio
    const producto = await Producto.findOne({ where: { id: productoId, negocioId } });
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    const variantes = await ProductoVariante.findAll({
      where: { productoId },
      order: [['orden', 'ASC'], ['nombre', 'ASC']]
    });
    res.json({ success: true, variantes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Crear variante ────────────────────────────────────────
exports.crear = async (req, res) => {
  try {
    const { negocioId, productoId } = req.params;
    const producto = await Producto.findOne({ where: { id: productoId, negocioId } });
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    const variante = await ProductoVariante.create({ ...req.body, productoId, negocioId });
    res.status(201).json({ success: true, variante });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Actualizar variante ───────────────────────────────────
exports.actualizar = async (req, res) => {
  try {
    const { negocioId, varianteId } = req.params;
    const variante = await ProductoVariante.findOne({ where: { id: varianteId, negocioId } });
    if (!variante) return res.status(404).json({ success: false, message: 'Variante no encontrada' });
    await variante.update(req.body);
    res.json({ success: true, variante });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Eliminar variante ─────────────────────────────────────
exports.eliminar = async (req, res) => {
  try {
    const { negocioId, varianteId } = req.params;
    const variante = await ProductoVariante.findOne({ where: { id: varianteId, negocioId } });
    if (!variante) return res.status(404).json({ success: false, message: 'Variante no encontrada' });
    await variante.destroy();
    res.json({ success: true, message: 'Variante eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Reemplazar todas las variantes de un producto (bulk) ──
exports.sincronizar = async (req, res) => {
  try {
    const { negocioId, productoId } = req.params;
    const { variantes } = req.body;
    const producto = await Producto.findOne({ where: { id: productoId, negocioId } });
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    await ProductoVariante.destroy({ where: { productoId } });
    if (variantes && variantes.length > 0) {
      await ProductoVariante.bulkCreate(variantes.map((v, i) => ({
        ...v,
        productoId,
        negocioId,
        orden: i
      })));
    }

    const nuevas = await ProductoVariante.findAll({ where: { productoId }, order: [['orden', 'ASC']] });
    res.json({ success: true, variantes: nuevas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
