const { Proveedor, Producto, Gasto, Compra, Caja } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');

// Listar proveedores (con cuenta corriente)
exports.listar = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { activo, buscar } = req.query;

    const where = { negocioId };
    if (activo !== undefined) where.activo = activo === 'true';
    if (buscar && buscar.trim()) {
      const q = `%${buscar.trim()}%`;
      where[Op.or] = [
        { nombre: { [Op.iLike]: q } },
        { telefono: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } }
      ];
    }

    const proveedores = await Proveedor.findAll({ where, order: [['nombre', 'ASC']] });
    res.json({ success: true, proveedores });
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    res.status(500).json({ success: false, message: 'Error al obtener proveedores', error: error.message });
  }
};

// Rango de fechas segun periodo/fechas explicitas (para la ficha)
function calcularRango({ periodo, fechaDesde, fechaHasta }) {
  if (fechaDesde || fechaHasta) {
    return { desde: fechaDesde || null, hasta: fechaHasta || null };
  }
  const hoy = new Date();
  const iso = (d) => d.toISOString().split('T')[0];
  if (periodo === 'hoy') return { desde: iso(hoy), hasta: iso(hoy) };
  if (periodo === 'semana') {
    const d = new Date(hoy); d.setDate(d.getDate() - 6);
    return { desde: iso(d), hasta: iso(hoy) };
  }
  if (periodo === 'mes') {
    return { desde: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`, hasta: iso(hoy) };
  }
  return { desde: null, hasta: null };
}

// Detalle/ficha del proveedor con movimientos y estadisticas
exports.obtener = async (req, res) => {
  try {
    const { negocioId, id } = req.params;

    const proveedor = await Proveedor.findOne({ where: { id, negocioId } });
    if (!proveedor) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    const { desde, hasta } = calcularRango(req.query);
    const filtroFecha = (campo) => {
      if (!desde && !hasta) return {};
      return { [campo]: { [Op.between]: [desde || '1900-01-01', hasta || '2999-12-31'] } };
    };

    // Compras del proveedor (movimiento tipo compra)
    const compras = await Compra.findAll({
      where: { negocioId, proveedorId: id, ...filtroFecha('fecha') },
      order: [['fecha', 'DESC']]
    });

    // Gastos del proveedor que NO provienen de una compra (para no duplicar)
    const gastos = await Gasto.findAll({
      where: { negocioId, proveedorId: id, compraId: null, ...filtroFecha('fecha') },
      order: [['fecha', 'DESC']]
    });

    const movimientos = [
      ...compras.map(c => ({
        id: `compra-${c.id}`,
        tipo: 'compra',
        es_compra: true,
        descripcion: c.notas || `Compra ${c.numeroFactura || ''}`.trim(),
        fecha: c.fecha,
        monto: Number(c.total),
        total_factura: Number(c.total),
        metodo_pago: c.metodoPago,
        pagado: c.pagado,
        recibo_url: null
      })),
      ...gastos.map(g => ({
        id: g.id,
        tipo: g.tipo,
        es_compra: false,
        descripcion: g.descripcion,
        fecha: g.fecha,
        monto: Number(g.monto),
        total_factura: g.totalFactura != null ? Number(g.totalFactura) : 0,
        metodo_pago: g.metodoPago,
        recibo_url: g.reciboUrl
      }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Estadisticas
    const totalMonto = movimientos.reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const estadisticas = {
      total_gastos: movimientos.length,
      total_monto: totalMonto,
      promedio_gasto: movimientos.length ? totalMonto / movimientos.length : 0
    };

    // Por mes (ultimos meses)
    const porMes = {};
    movimientos.forEach(m => {
      const d = new Date(m.fecha);
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      porMes[clave] = (porMes[clave] || 0) + (Number(m.monto) || 0);
    });
    const estadisticas_por_mes = Object.entries(porMes)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => new Date(b.mes) - new Date(a.mes));

    res.json({
      success: true,
      ...proveedor.toJSON(),
      saldo_deuda: Number(proveedor.saldoDeuda) || 0,
      saldo_a_favor: Number(proveedor.saldoAFavor) || 0,
      movimientos,
      estadisticas,
      estadisticas_por_mes
    });
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    res.status(500).json({ success: false, message: 'Error al obtener proveedor', error: error.message });
  }
};

// Crear proveedor
exports.crear = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { nombre, contacto, telefono, email, direccion, notas, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre del proveedor es requerido' });
    }

    const proveedor = await Proveedor.create({
      negocioId, nombre, contacto, telefono, email, direccion, notas,
      activo: activo !== undefined ? activo : true
    });

    res.status(201).json({ success: true, proveedor });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ success: false, message: 'Error al crear proveedor', error: error.message });
  }
};

// Actualizar proveedor
exports.actualizar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const { nombre, contacto, telefono, email, direccion, notas, activo } = req.body;

    const proveedor = await Proveedor.findOne({ where: { id, negocioId } });
    if (!proveedor) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    await proveedor.update({ nombre, contacto, telefono, email, direccion, notas, activo });
    res.json({ success: true, proveedor });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar proveedor', error: error.message });
  }
};

// Registrar pago (les debemos) o cobro (nos deben) de la cuenta corriente
exports.registrarPago = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { negocioId, id } = req.params;
    const { monto, metodoPago, tipoPago, descripcion, reciboUrl, fecha, origenDinero, tipoComprobante } = req.body;

    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0' });
    }

    const proveedor = await Proveedor.findOne({ where: { id, negocioId }, transaction: t });
    if (!proveedor) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    const esCobro = tipoPago === 'cobro_deuda';
    const saldoActual = esCobro ? Number(proveedor.saldoDeuda) : Number(proveedor.saldoAFavor);
    if (saldoActual <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: esCobro ? 'Este proveedor no nos debe nada para cobrar' : 'No le debemos nada a este proveedor'
      });
    }
    if (montoNum > saldoActual) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'El monto no puede superar el saldo pendiente' });
    }

    // Origen del dinero + caja abierta
    const origen = ['caja', 'local', 'otro'].includes(origenDinero) ? origenDinero : 'local';
    let cajaId = null;
    if (origen === 'caja') {
      const cajaAbierta = await Caja.findOne({ where: { negocioId, estado: 'abierta' }, order: [['aperturaAt', 'DESC']], transaction: t });
      cajaId = cajaAbierta ? cajaAbierta.id : null;
    }

    const esFacturaA = tipoComprobante === 'factura_a';

    // Registrar el movimiento como gasto tipo pago_proveedor
    await Gasto.create({
      negocioId,
      proveedorId: id,
      fecha: fecha || new Date(),
      descripcion: descripcion || (esCobro ? 'Cobro de deuda del proveedor' : 'Pago de deuda al proveedor'),
      monto: montoNum,
      categoria: 'proveedores',
      metodoPago: metodoPago || 'efectivo',
      tipo: 'pago_proveedor',
      tipoPagoProveedor: esCobro ? 'cobro_deuda' : 'pago_deuda',
      origenDinero: origen,
      cajaId,
      tipoComprobante: esFacturaA ? 'factura_a' : null,
      ivaIncluido: esFacturaA,
      porcentajeIva: esFacturaA ? 21 : 0,
      montoIva: esFacturaA ? Number((montoNum * 21 / 121).toFixed(2)) : 0,
      reciboUrl: reciboUrl || null
    }, { transaction: t });

    // Bajar el saldo correspondiente
    if (esCobro) {
      await proveedor.update({ saldoDeuda: Math.max(0, Number(proveedor.saldoDeuda) - montoNum) }, { transaction: t });
    } else {
      await proveedor.update({ saldoAFavor: Math.max(0, Number(proveedor.saldoAFavor) - montoNum) }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, message: 'Movimiento registrado' });
  } catch (error) {
    await t.rollback();
    console.error('Error al registrar pago:', error);
    res.status(500).json({ success: false, message: 'Error al registrar el pago', error: error.message });
  }
};

// Archivar (baja logica)
exports.eliminar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const proveedor = await Proveedor.findOne({ where: { id, negocioId } });
    if (!proveedor) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }
    await proveedor.update({ activo: false });
    res.json({ success: true, message: 'Proveedor archivado' });
  } catch (error) {
    console.error('Error al archivar proveedor:', error);
    res.status(500).json({ success: false, message: 'Error al archivar proveedor', error: error.message });
  }
};

// Reactivar
exports.reactivar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const proveedor = await Proveedor.findOne({ where: { id, negocioId } });
    if (!proveedor) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }
    await proveedor.update({ activo: true });
    res.json({ success: true, message: 'Proveedor reactivado' });
  } catch (error) {
    console.error('Error al reactivar proveedor:', error);
    res.status(500).json({ success: false, message: 'Error al reactivar proveedor', error: error.message });
  }
};

// Eliminar definitivo (con chequeo de productos asociados)
exports.eliminarDefinitivo = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const proveedor = await Proveedor.findOne({ where: { id, negocioId } });
    if (!proveedor) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    const productosCount = await Producto.count({ where: { proveedorId: id } });
    if (productosCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. Hay ${productosCount} producto(s) asociado(s) a este proveedor.`
      });
    }

    await proveedor.destroy();
    res.json({ success: true, message: 'Proveedor eliminado definitivamente' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar proveedor', error: error.message });
  }
};
