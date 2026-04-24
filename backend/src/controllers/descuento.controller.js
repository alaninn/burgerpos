const { Descuento } = require('../models');

exports.listar = async (req, res) => {
  try {
    const descuentos = await Descuento.findAll({
      where: { negocioId: req.params.negocioId },
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
