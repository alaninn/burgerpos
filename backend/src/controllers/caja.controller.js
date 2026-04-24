const { Caja, Usuario, Pedido } = require('../models');
const { Op } = require('sequelize');

exports.listar = async (req, res) => {
  try {
    const cajas = await Caja.findAll({
      where: { negocioId: req.params.negocioId },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }],
      order: [['createdAt', 'DESC']],
      limit: 30
    });
    res.json({ success: true, cajas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actual = async (req, res) => {
  try {
    const caja = await Caja.findOne({
      where: { negocioId: req.params.negocioId, estado: 'abierta' },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }],
      order: [['aperturaAt', 'DESC']]
    });
    if (!caja) return res.json({ success: true, caja: null });

    // Calcular totales en tiempo real para la caja abierta
    const pedidos = await Pedido.findAll({
      where: {
        negocioId: req.params.negocioId,
        createdAt: { [Op.between]: [caja.aperturaAt, new Date()] },
        estado: { [Op.ne]: 'cancelado' }
      }
    });

    let totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0, totalVentas = 0;
    pedidos.forEach(p => {
      const t = parseFloat(p.total) || 0;
      totalVentas += t;
      if (p.metodoPago === 'efectivo' || p.metodoPago === 'efectivo_sin_descuento') totalEfectivo += t;
      else if (p.metodoPago === 'tarjeta') totalTarjeta += t;
      else if (p.metodoPago === 'transferencia') totalTransferencia += t;
    });

    res.json({
      success: true,
      caja: {
        ...caja.toJSON(),
        totalEfectivo, totalTarjeta, totalTransferencia, totalVentas,
        totalPedidos: pedidos.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.abrir = async (req, res) => {
  try {
    const { negocioId } = req.params;
    // Check no hay caja abierta
    const existente = await Caja.findOne({ where: { negocioId, estado: 'abierta' } });
    if (existente) return res.status(400).json({ success: false, message: 'Ya hay una caja abierta' });

    const caja = await Caja.create({
      negocioId,
      usuarioId: req.usuario?.id || null,
      saldoInicial: req.body.saldoInicial || 0,
      aperturaAt: new Date()
    });
    res.status(201).json({ success: true, caja });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cerrar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;

    const caja = await Caja.findOne({ where: { id, negocioId, estado: 'abierta' } });
    if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada o ya cerrada' });

    // Calcular totales de pedidos en el período
    const pedidos = await Pedido.findAll({
      where: {
        negocioId,
        createdAt: { [Op.between]: [caja.aperturaAt, new Date()] },
        estado: { [Op.ne]: 'cancelado' }
      }
    });

    let totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0, totalVentas = 0;
    pedidos.forEach(p => {
      const t = parseFloat(p.total) || 0;
      totalVentas += t;
      if (p.metodoPago === 'efectivo' || p.metodoPago === 'efectivo_sin_descuento') totalEfectivo += t;
      else if (p.metodoPago === 'tarjeta') totalTarjeta += t;
      else if (p.metodoPago === 'transferencia') totalTransferencia += t;
    });

    const { efectivoReal, notas } = req.body;
    const diferencia = efectivoReal !== undefined
      ? parseFloat(efectivoReal) - (parseFloat(caja.saldoInicial) + totalEfectivo)
      : 0;

    await caja.update({
      estado: 'cerrada',
      totalEfectivo,
      totalTarjeta,
      totalTransferencia,
      totalVentas,
      diferencia,
      notas: notas || '',
      cierreAt: new Date()
    });

    res.json({ success: true, caja });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
