const { Gasto, Proveedor, Compra, Caja } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');

// Listar gastos
exports.listar = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { fechaDesde, fechaHasta, categoria, tipo } = req.query;

    const where = { negocioId };

    if (fechaDesde) {
      where.fecha = {
        [Op.between]: [fechaDesde, fechaHasta || fechaDesde]
      };
    }
    if (categoria) where.categoria = categoria;
    if (tipo && tipo !== 'todos') where.tipo = tipo;

    const gastos = await Gasto.findAll({
      where,
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] },
        { model: Compra, as: 'compra', attributes: ['id', 'numeroFactura', 'fecha'] }
      ],
      order: [['fecha', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, gastos });
  } catch (error) {
    console.error('Error al listar gastos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener gastos', error: error.message });
  }
};

// Calcula el IVA contenido cuando el comprobante es Factura A (precio con IVA incluido)
function calcularMontoIva(monto, porcentaje, esFacturaA) {
  const pct = Number(porcentaje || 0);
  if (!esFacturaA || pct <= 0) return 0;
  return Number((Number(monto) * pct / (100 + pct)).toFixed(2));
}

// Crear gasto (gasto comun o pago a proveedor)
exports.crear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { negocioId } = req.params;
    const b = req.body;
    const monto = Number(b.monto);

    if (b.descripcion == null || b.monto == null || b.monto === '' || isNaN(monto) || monto < 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Descripción y monto válido son requeridos' });
    }

    const tipo = b.tipo || 'variable';
    const esPagoProveedor = tipo === 'pago_proveedor';

    // Validar proveedor
    if (b.proveedorId) {
      const prov = await Proveedor.findOne({ where: { id: b.proveedorId, negocioId }, transaction: t });
      if (!prov) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Proveedor no encontrado' });
      }
    }

    // Dato fiscal e IVA (solo Factura A discrimina IVA credito)
    const esFacturaA = b.tipoComprobante === 'factura_a';
    const ivaPct = esFacturaA ? Number(b.porcentajeIva || 21) : 0;
    const montoIva = calcularMontoIva(monto, ivaPct, esFacturaA);

    // De donde sale la plata; si es 'caja' se vincula a la caja abierta
    const origenDinero = ['caja', 'local', 'otro'].includes(b.origenDinero) ? b.origenDinero : 'local';
    let cajaId = null;
    if (origenDinero === 'caja') {
      const cajaAbierta = await Caja.findOne({
        where: { negocioId, estado: 'abierta' },
        order: [['aperturaAt', 'DESC']],
        transaction: t
      });
      cajaId = cajaAbierta ? cajaAbierta.id : (b.cajaId || null);
    }

    const gasto = await Gasto.create({
      negocioId,
      fecha: b.fecha || new Date(),
      descripcion: b.descripcion || (esPagoProveedor ? 'Pago a proveedor' : ''),
      monto,
      categoria: esPagoProveedor ? 'proveedores' : (b.categoria || 'otro'),
      metodoPago: b.metodoPago || 'efectivo',
      proveedorId: b.proveedorId || null,
      compraId: b.compraId || null,
      notas: b.notas || null,
      tipo,
      origenDinero,
      cajaId,
      tipoComprobante: esFacturaA ? 'factura_a' : null,
      tipoPagoProveedor: esPagoProveedor ? (b.tipoPagoProveedor || 'a_cuenta') : null,
      reciboUrl: b.reciboUrl || null,
      numeroBoleta: b.numeroBoleta || null,
      ivaIncluido: esFacturaA,
      porcentajeIva: ivaPct,
      montoIva,
      totalFactura: b.totalFactura != null && b.totalFactura !== '' ? Number(b.totalFactura) : null
    }, { transaction: t });

    // Cuenta corriente del proveedor
    if (esPagoProveedor && b.proveedorId) {
      const prov = await Proveedor.findOne({ where: { id: b.proveedorId, negocioId }, transaction: t });
      let saldoAFavor = Number(prov.saldoAFavor) || 0;
      let saldoDeuda = Number(prov.saldoDeuda) || 0;

      // Registrar una nueva factura recibida suma lo que le debemos
      if (b.registrarNuevaFactura && Number(b.totalFactura) > 0) {
        saldoAFavor += Number(b.totalFactura);
      }
      // El pago baja el saldo correspondiente
      if (monto > 0) {
        if (b.tipoPagoProveedor === 'cobro_deuda') saldoDeuda = Math.max(0, saldoDeuda - monto);
        else saldoAFavor = Math.max(0, saldoAFavor - monto);
      }
      await prov.update({ saldoAFavor, saldoDeuda }, { transaction: t });
    }

    await t.commit();

    const gastoCompleto = await Gasto.findByPk(gasto.id, {
      include: [{ model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] }]
    });
    res.status(201).json({ success: true, gasto: gastoCompleto });
  } catch (error) {
    await t.rollback();
    console.error('Error al crear gasto:', error);
    res.status(500).json({ success: false, message: 'Error al crear gasto', error: error.message });
  }
};

// Actualizar gasto (edita campos; no reconcilia saldos de proveedor)
exports.actualizar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const b = req.body;

    const gasto = await Gasto.findOne({ where: { id, negocioId } });
    if (!gasto) {
      return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
    }

    const esFacturaA = b.tipoComprobante === 'factura_a';
    const ivaPct = esFacturaA ? Number(b.porcentajeIva || 21) : 0;
    const montoIva = calcularMontoIva(Number(b.monto ?? gasto.monto), ivaPct, esFacturaA);

    const campos = {
      fecha: b.fecha ?? gasto.fecha,
      descripcion: b.descripcion ?? gasto.descripcion,
      monto: b.monto ?? gasto.monto,
      categoria: b.categoria ?? gasto.categoria,
      metodoPago: b.metodoPago ?? gasto.metodoPago,
      proveedorId: b.proveedorId !== undefined ? (b.proveedorId || null) : gasto.proveedorId,
      notas: b.notas ?? gasto.notas
    };
    // Campos fiscales / origen solo si vienen en el body
    if (b.origenDinero !== undefined && ['caja', 'local', 'otro'].includes(b.origenDinero)) campos.origenDinero = b.origenDinero;
    if (b.tipoComprobante !== undefined) {
      campos.tipoComprobante = esFacturaA ? 'factura_a' : null;
      campos.ivaIncluido = esFacturaA;
      campos.porcentajeIva = ivaPct;
      campos.montoIva = montoIva;
    }
    if (b.reciboUrl !== undefined) campos.reciboUrl = b.reciboUrl || null;
    if (b.numeroBoleta !== undefined) campos.numeroBoleta = b.numeroBoleta || null;

    await gasto.update(campos);

    const gastoCompleto = await Gasto.findByPk(gasto.id, {
      include: [{ model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] }]
    });
    res.json({ success: true, gasto: gastoCompleto });
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar gasto', error: error.message });
  }
};

// Eliminar gasto (revierte el efecto en la cuenta corriente del proveedor)
exports.eliminar = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { negocioId, id } = req.params;

    const gasto = await Gasto.findOne({ where: { id, negocioId }, transaction: t });
    if (!gasto) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
    }

    // Los gastos generados por una compra se eliminan junto con la compra
    if (gasto.compraId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No se puede eliminar. Este gasto está vinculado a una compra.' });
    }

    // Revertir el efecto de un pago a proveedor sobre los saldos
    if (gasto.proveedorId && gasto.tipo === 'pago_proveedor') {
      const prov = await Proveedor.findOne({ where: { id: gasto.proveedorId, negocioId }, transaction: t });
      if (prov) {
        let saldoAFavor = Number(prov.saldoAFavor) || 0;
        let saldoDeuda = Number(prov.saldoDeuda) || 0;
        const monto = Number(gasto.monto) || 0;

        // Deshacer el registro de factura, si lo hubo
        if (Number(gasto.totalFactura) > 0) {
          saldoAFavor = Math.max(0, saldoAFavor - Number(gasto.totalFactura));
        }
        // Restaurar el pago al saldo del que se descontó
        if (monto > 0) {
          if (gasto.tipoPagoProveedor === 'cobro_deuda') saldoDeuda += monto;
          else saldoAFavor += monto;
        }
        await prov.update({ saldoAFavor, saldoDeuda }, { transaction: t });
      }
    }

    await gasto.destroy({ transaction: t });
    await t.commit();

    res.json({ success: true, message: 'Gasto eliminado correctamente' });
  } catch (error) {
    await t.rollback();
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar gasto', error: error.message });
  }
};

// Resumen de gastos
exports.resumen = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { fechaDesde, fechaHasta } = req.query;

    const where = { negocioId };
    if (fechaDesde) {
      where.fecha = { [Op.between]: [fechaDesde, fechaHasta || fechaDesde] };
    }

    const resumenCategoria = await Gasto.findAll({
      where,
      attributes: [
        'categoria',
        [sequelize.fn('SUM', sequelize.col('monto')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['categoria'],
      raw: true
    });

    const resumenMetodoPago = await Gasto.findAll({
      where,
      attributes: [
        'metodoPago',
        [sequelize.fn('SUM', sequelize.col('monto')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['metodoPago'],
      raw: true
    });

    const totalGeneral = await Gasto.sum('monto', { where });

    res.json({
      success: true,
      resumen: {
        totalGeneral: totalGeneral || 0,
        porCategoria: resumenCategoria,
        porMetodoPago: resumenMetodoPago
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de gastos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen', error: error.message });
  }
};
