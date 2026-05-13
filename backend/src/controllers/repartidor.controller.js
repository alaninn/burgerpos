const { Repartidor, Pedido } = require('../models');
const { Op } = require('sequelize');

exports.listar = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const repartidores = await Repartidor.findAll({ where: { negocioId } });

    if (req.query.includeStats !== 'true') {
      return res.json({ success: true, repartidores });
    }

    const { fechaDesde, fechaHasta } = req.query;
    const where = { negocioId, modalidad: 'delivery' };
    if (fechaDesde) {
      const finStr = fechaHasta || new Date().toISOString().split('T')[0];
      where.createdAt = {
        [Op.between]: [
          new Date(fechaDesde + 'T00:00:00.000Z'),
          new Date(finStr + 'T23:59:59.999Z')
        ]
      };
    }

    const pedidos = await Pedido.findAll({ where });

    const statsMap = {};
    repartidores.forEach(r => {
      statsMap[r.id] = { totalPedidos: 0, totalMonto: 0, efectivo: 0, online: 0, envios: 0, propinas: 0 };
    });

    pedidos.forEach(p => {
      const key = p.repartidorId;
      if (!key || !statsMap[key]) return;
      const total = parseFloat(p.total) || 0;
      statsMap[key].totalPedidos++;
      statsMap[key].totalMonto += total;
      if (['efectivo', 'efectivo_sin_descuento'].includes(p.metodoPago)) {
        statsMap[key].efectivo += total;
      } else {
        statsMap[key].online += total;
      }
      statsMap[key].envios += parseFloat(p.costoEnvio) || 0;
      statsMap[key].propinas += parseFloat(p.propina) || 0;
    });

    const repartidoresConStats = repartidores.map(r => ({
      ...r.toJSON(),
      stats: statsMap[r.id] || { totalPedidos: 0, totalMonto: 0, efectivo: 0, online: 0, envios: 0, propinas: 0 }
    }));

    res.json({ success: true, repartidores: repartidoresConStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const repartidor = await Repartidor.create({ ...req.body, negocioId: req.params.negocioId });
    res.status(201).json({ success: true, repartidor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const rep = await Repartidor.findByPk(req.params.id);
    if (!rep) return res.status(404).json({ success: false, message: 'No encontrado' });
    await rep.update(req.body);
    res.json({ success: true, repartidor: rep });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const rep = await Repartidor.findByPk(req.params.id);
    if (!rep) return res.status(404).json({ success: false, message: 'No encontrado' });
    await rep.destroy();
    res.json({ success: true, message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reportes = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { fechaDesde, fechaHasta } = req.query;
    const where = { negocioId, modalidad: 'delivery' };
    if (fechaDesde) {
      const finStr = fechaHasta || new Date().toISOString().split('T')[0];
      where.createdAt = {
        [Op.between]: [
          new Date(fechaDesde + 'T00:00:00.000Z'),
          new Date(finStr + 'T23:59:59.999Z')
        ]
      };
    }
    const pedidos = await Pedido.findAll({ where, include: [{ model: Repartidor, as: 'repartidor' }] });
    const map = {};
    pedidos.forEach(p => {
      const key = p.repartidorId || 'sin_asignar';
      const nombre = p.repartidor?.nombre || 'Sin asignar';
      if (!map[key]) map[key] = { id: key, nombre, pedidos: 0, total: 0, envios: 0 };
      map[key].pedidos++;
      map[key].total += parseFloat(p.total);
      map[key].envios += parseFloat(p.costoEnvio);
    });
    res.json({ success: true, reportes: Object.values(map) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
