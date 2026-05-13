const { Descuento, Producto } = require('../models');

exports.listar = async (req, res) => {
  try {
    const descuentos = await Descuento.findAll({
      where: { negocioId: req.params.negocioId },
      include: [
        { model: Producto, as: 'productos', attributes: ['id'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, descuentos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const descuento = await Descuento.create({ ...req.body, negocioId: req.params.negocioId });
    res.status(201).json({ success: true, descuento });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const descuento = await Descuento.findByPk(req.params.id);
    if (!descuento) return res.status(404).json({ success: false, message: 'No encontrado' });
    await descuento.update(req.body);
    res.json({ success: true, descuento });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const descuento = await Descuento.findByPk(req.params.id);
    if (!descuento) return res.status(404).json({ success: false, message: 'No encontrado' });

    // Verificar si hay productos usando este descuento
    const productosConDescuento = await Producto.count({
      where: { descuentoId: req.params.id }
    });

    if (productosConDescuento > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. ${productosConDescuento} producto(s) están usando este descuento. Primero desasignalo de los productos.`
      });
    }

    await descuento.destroy();
    res.json({ success: true, message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.validar = async (req, res) => {
  try {
    const { codigo, total } = req.body;
    const descuento = await Descuento.findOne({
      where: { negocioId: req.params.negocioId, codigo: codigo.toUpperCase(), activo: true }
    });
    if (!descuento) return res.status(404).json({ success: false, message: 'Cupón inválido o inactivo' });
    if (descuento.fechaVencimiento && new Date(descuento.fechaVencimiento) < new Date())
      return res.status(400).json({ success: false, message: 'Cupón vencido' });
    if (descuento.usosMax && descuento.usosActuales >= descuento.usosMax)
      return res.status(400).json({ success: false, message: 'Cupón agotado' });
    if (total && descuento.minimoCompra && parseFloat(total) < parseFloat(descuento.minimoCompra))
      return res.status(400).json({ success: false, message: `Mínimo de compra: $${descuento.minimoCompra}` });

    const montoDescuento = descuento.tipo === 'porcentaje'
      ? (parseFloat(total || 0) * parseFloat(descuento.valor)) / 100
      : parseFloat(descuento.valor);

    res.json({ success: true, descuento, montoDescuento });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.obtenerAutomaticos = async (req, res) => {
  try {
    const { modalidad, metodoPago, subtotal } = req.query;
    const where = {
      negocioId: req.params.negocioId,
      activo: true,
      aplicaAutomatico: true
    };

    // Buscar descuentos aplicables
    const descuentos = await Descuento.findAll({ where });

    const aplicables = descuentos.filter(d => {
      // Verificar vencimiento
      if (d.fechaVencimiento && new Date(d.fechaVencimiento) < new Date()) return false;

      // Verificar usos máximos
      if (d.usosMax && d.usosActuales >= d.usosMax) return false;

      // Verificar mínimo de compra
      if (subtotal && d.minimoCompra && parseFloat(subtotal) < parseFloat(d.minimoCompra)) return false;

      // Filtrar por categoría
      if (d.categoria === 'global') return true;
      if (d.categoria === 'modalidad' && d.modalidad === modalidad) return true;
      if (d.categoria === 'metodo_pago' && d.metodoPagoDesc === metodoPago) return true;

      return false;
    });

    // Calcular montos de descuento
    const descuentosConMonto = aplicables.map(d => {
      const monto = d.tipo === 'porcentaje'
        ? (parseFloat(subtotal || 0) * parseFloat(d.valor)) / 100
        : parseFloat(d.valor);

      return {
        id: d.id,
        categoria: d.categoria,
        tipo: d.tipo,
        valor: d.valor,
        descripcion: d.descripcion,
        codigo: d.codigo,
        monto: Math.round(monto)
      };
    });

    res.json({ success: true, descuentos: descuentosConMonto });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
