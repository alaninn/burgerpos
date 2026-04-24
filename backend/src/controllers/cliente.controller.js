const { Cliente, Pedido } = require('../models');
const { fn, col, Op } = require('sequelize');

exports.listar = async (req, res) => {
  try {
    const { q } = req.query;
    const negocioId = req.params.negocioId;

    // ── Búsqueda rápida (con q): query simple sin GROUP BY ────────
    if (q) {
      const where = { negocioId };
      const orConds = [
        { nombre:   { [Op.iLike]: `%${q}%` } },
        { telefono: { [Op.iLike]: `%${q}%` } },
      ];
      // Solo buscar por numeroCliente si el query es puramente numérico
      const numQ = parseInt(q, 10);
      if (!isNaN(numQ) && String(numQ) === q.trim()) {
        orConds.push({ numeroCliente: numQ });
      }
      where[Op.or] = orConds;

      const clientes = await Cliente.findAll({
        where,
        order: [['nombre', 'ASC']],
        limit: 8,
      });

      // Contar pedidos por separado para no mezclar GROUP BY con OR de tipos mixtos
      const ids = clientes.map(c => c.id);
      const counts = ids.length
        ? await Pedido.findAll({
            where: { clienteId: ids },
            attributes: ['clienteId', [fn('COUNT', col('id')), 'cnt']],
            group: ['clienteId'],
            raw: true,
          })
        : [];
      const countMap = Object.fromEntries(counts.map(c => [c.clienteId, parseInt(c.cnt) || 0]));

      const result = clientes.map(c => ({
        ...c.toJSON(),
        _count: { pedidos: countMap[c.id] || 0 },
      }));
      return res.json({ success: true, clientes: result });
    }

    // ── Lista completa (sin q): con COUNT de pedidos ──────────────
    const clientes = await Cliente.findAll({
      where: { negocioId },
      include: [{ model: Pedido, as: 'pedidos', attributes: [] }],
      attributes: { include: [[fn('COUNT', col('pedidos.id')), 'pedidosCount']] },
      group: ['Cliente.id'],
      order: [['nombre', 'ASC']],
    });
    const result = clientes.map(c => ({
      ...c.toJSON(),
      _count: { pedidos: parseInt(c.dataValues.pedidosCount) || 0 },
    }));
    res.json({ success: true, clientes: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    // Auto-assign numero_cliente
    const count = await Cliente.count({ where: { negocioId: req.params.negocioId } });
    const cliente = await Cliente.create({
      ...req.body,
      negocioId: req.params.negocioId,
      numeroCliente: count + 1
    });
    res.status(201).json({ success: true, cliente });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const { ItemPedido } = require('../models');
    const cliente = await Cliente.findByPk(req.params.id, {
      include: [{
        model: Pedido,
        as: 'pedidos',
        limit: 20,
        order: [['createdAt', 'DESC']],
        include: [{ model: ItemPedido, as: 'items', attributes: ['nombre', 'cantidad', 'precioUnitario'] }]
      }]
    });
    if (!cliente) return res.status(404).json({ success: false, message: 'No encontrado' });

    // Calcular estadísticas
    const allPedidos = await Pedido.findAll({
      where: { clienteId: req.params.id, estado: { [require('sequelize').Op.ne]: 'cancelado' } },
      include: [{ model: ItemPedido, as: 'items', attributes: ['nombre', 'cantidad'] }]
    });

    const totalGastado = allPedidos.reduce((s, p) => s + parseFloat(p.total || 0), 0);
    const totalPedidos = allPedidos.length;

    // Productos más pedidos
    const productCount = {};
    allPedidos.forEach(p => {
      (p.items || []).forEach(item => {
        productCount[item.nombre] = (productCount[item.nombre] || 0) + item.cantidad;
      });
    });
    const productosFavoritos = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    res.json({
      success: true,
      cliente: {
        ...cliente.toJSON(),
        stats: { totalGastado, totalPedidos, productosFavoritos }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ success: false, message: 'No encontrado' });
    await cliente.update(req.body);
    res.json({ success: true, cliente });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ success: false, message: 'No encontrado' });
    await cliente.destroy();
    res.json({ success: true, message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
