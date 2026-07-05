const { Caja, CajaDefinida, CajaUsuario, Usuario, Pedido, Gasto } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');

const esAdmin = (req) => ['admin', 'superadmin'].includes(req.usuario?.rol);

// Calcula los totales de una caja: ventas por metodo (desde los pedidos de esa
// caja; para cajas viejas sin cajaId, cae a la ventana de tiempo) menos los
// gastos en efectivo que salieron de la caja.
async function calcularTotales(caja) {
  const wherePedidos = {
    negocioId: caja.negocioId,
    estado: { [Op.ne]: 'cancelado' }
  };
  // Si ya hay pedidos vinculados a la caja, se usa ese vinculo; si no (cajas
  // abiertas antes de esta version), se usa la ventana de apertura.
  const vinculados = await Pedido.count({ where: { cajaId: caja.id } });
  if (vinculados > 0) {
    wherePedidos.cajaId = caja.id;
  } else {
    wherePedidos.cajaId = { [Op.is]: null };
    wherePedidos.createdAt = { [Op.between]: [caja.aperturaAt, caja.cierreAt || new Date()] };
  }

  const pedidos = await Pedido.findAll({ where: wherePedidos });
  let totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0, totalMercadopago = 0, totalVentas = 0;
  pedidos.forEach(p => {
    const t = parseFloat(p.total) || 0;
    totalVentas += t;
    if (p.metodoPago === 'efectivo' || p.metodoPago === 'efectivo_sin_descuento') totalEfectivo += t;
    else if (p.metodoPago === 'tarjeta') totalTarjeta += t;
    else if (p.metodoPago === 'transferencia') totalTransferencia += t;
    else if (p.metodoPago === 'mercado_pago') totalMercadopago += t;
  });

  // Gastos en efectivo que salieron de esta caja
  const gastosCaja = await Gasto.sum('monto', {
    where: { cajaId: caja.id, origenDinero: 'caja', metodoPago: 'efectivo' }
  }) || 0;

  return { totalEfectivo, totalTarjeta, totalTransferencia, totalMercadopago, totalVentas, totalPedidos: pedidos.length, gastosCaja: Number(gastosCaja) };
}

// ── Cajas fijas ───────────────────────────────────────────
exports.listarCajasFijas = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const cajas = await CajaDefinida.findAll({
      where: { negocioId, activa: true },
      order: [['orden', 'ASC'], ['createdAt', 'ASC']]
    });
    // Estado: si cada caja fija tiene un turno abierto ahora
    const abiertas = await Caja.findAll({
      where: { negocioId, estado: 'abierta', cajaDefinidaId: { [Op.ne]: null } },
      attributes: ['id', 'cajaDefinidaId', 'aperturaAt']
    });
    const porDefinida = {};
    abiertas.forEach(t => { porDefinida[t.cajaDefinidaId] = t });
    res.json({
      success: true,
      cajasFijas: cajas.map(c => ({
        ...c.toJSON(),
        turnoAbiertoId: porDefinida[c.id]?.id || null,
        turnoAbiertoDesde: porDefinida[c.id]?.aperturaAt || null
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crearCajaFija = async (req, res) => {
  try {
    const { negocioId } = req.params;
    if (!esAdmin(req)) return res.status(403).json({ success: false, message: 'Solo el administrador puede crear cajas fijas' });
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });

    const existe = await CajaDefinida.findOne({
      where: { negocioId, activa: true, nombre: { [Op.iLike]: nombre } }
    });
    if (existe) return res.status(400).json({ success: false, message: `Ya existe una caja fija llamada "${nombre}"` });

    const max = await CajaDefinida.max('orden', { where: { negocioId } });
    const cajaFija = await CajaDefinida.create({ negocioId, nombre, orden: (Number(max) || 0) + 1 });
    res.status(201).json({ success: true, cajaFija });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.eliminarCajaFija = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    if (!esAdmin(req)) return res.status(403).json({ success: false, message: 'Solo el administrador puede eliminar cajas fijas' });
    const cajaFija = await CajaDefinida.findOne({ where: { id, negocioId } });
    if (!cajaFija) return res.status(404).json({ success: false, message: 'Caja fija no encontrada' });
    await cajaFija.update({ activa: false });
    res.json({ success: true, message: 'Caja fija eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Turnos ────────────────────────────────────────────────
exports.listar = async (req, res) => {
  try {
    const cajas = await Caja.findAll({
      where: { negocioId: req.params.negocioId },
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
        { model: CajaDefinida, as: 'cajaDefinida', attributes: ['id', 'nombre'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 30
    });
    res.json({ success: true, cajas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Caja del usuario actual (o, para compatibilidad, la caja abierta del negocio)
exports.actual = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const usuarioId = req.usuario?.id;

    let caja = null;
    if (usuarioId) {
      const membresia = await CajaUsuario.findOne({
        where: { negocioId, usuarioId },
        include: [{ model: Caja, as: 'caja', where: { estado: 'abierta' }, required: true }]
      });
      if (membresia) caja = membresia.caja;
    }
    // Compatibilidad: si no está en ninguna, devolver una caja abierta del negocio
    if (!caja) {
      caja = await Caja.findOne({ where: { negocioId, estado: 'abierta' }, order: [['aperturaAt', 'DESC']] });
    }
    if (!caja) return res.json({ success: true, caja: null });

    const totales = await calcularTotales(caja);
    res.json({ success: true, caja: { ...caja.toJSON(), ...totales } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Todas las cajas abiertas del negocio con sus totales
exports.abiertas = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const cajas = await Caja.findAll({
      where: { negocioId, estado: 'abierta' },
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
        { model: CajaUsuario, as: 'operadores', include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }] }
      ],
      order: [['aperturaAt', 'ASC']]
    });
    const conTotales = await Promise.all(cajas.map(async c => {
      const totales = await calcularTotales(c);
      return { ...c.toJSON(), ...totales };
    }));
    res.json({ success: true, cajas: conTotales });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.abrir = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { negocioId } = req.params;
    const usuarioId = req.usuario?.id || null;
    const { saldoInicial, nombre, cajaDefinidaId } = req.body;

    // El usuario no puede estar en dos cajas a la vez
    if (usuarioId) {
      const yaEnCaja = await CajaUsuario.findOne({
        where: { negocioId, usuarioId },
        include: [{ model: Caja, as: 'caja', where: { estado: 'abierta' }, required: true }],
        transaction: t
      });
      if (yaEnCaja) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Ya estás en la caja "${yaEnCaja.caja.nombre || 'actual'}"` });
      }
    }

    let nombreFinal = nombre || 'Caja Principal';
    let definidaId = null;
    if (cajaDefinidaId) {
      const cf = await CajaDefinida.findOne({ where: { id: cajaDefinidaId, negocioId, activa: true }, transaction: t });
      if (!cf) { await t.rollback(); return res.status(404).json({ success: false, message: 'La caja fija no existe' }); }
      const abierta = await Caja.findOne({ where: { negocioId, cajaDefinidaId, estado: 'abierta' }, transaction: t });
      if (abierta) { await t.rollback(); return res.status(400).json({ success: false, message: `La caja "${cf.nombre}" ya está abierta. Unite a ella.` }); }
      nombreFinal = cf.nombre;
      definidaId = cf.id;
    }

    const caja = await Caja.create({
      negocioId,
      usuarioId,
      nombre: nombreFinal,
      cajaDefinidaId: definidaId,
      saldoInicial: saldoInicial || 0,
      aperturaAt: new Date()
    }, { transaction: t });

    if (usuarioId) {
      await CajaUsuario.create({ cajaId: caja.id, usuarioId, negocioId }, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ success: true, caja });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.unirse = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const usuarioId = req.usuario?.id;
    if (!usuarioId) return res.status(400).json({ success: false, message: 'Usuario no identificado' });

    const caja = await Caja.findOne({ where: { id, negocioId, estado: 'abierta' } });
    if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada o cerrada' });

    const [membresia] = await CajaUsuario.findOrCreate({
      where: { cajaId: id, usuarioId },
      defaults: { cajaId: id, usuarioId, negocioId }
    });
    res.json({ success: true, caja });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.salir = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const usuarioId = req.usuario?.id;
    const caja = await Caja.findOne({ where: { id, negocioId, estado: 'abierta' } });
    if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada o ya cerrada' });

    await CajaUsuario.destroy({ where: { cajaId: id, usuarioId } });
    res.json({ success: true, message: `Saliste de la caja "${caja.nombre || 'actual'}". Sigue abierta para los demás.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cerrar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const caja = await Caja.findOne({ where: { id, negocioId, estado: 'abierta' } });
    if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada o ya cerrada' });

    const totales = await calcularTotales(caja);
    const {
      efectivoReal, efectivoRetirado, dineroSiguiente,
      tarjetaDeclarada, mercadopagoDeclarada, transferenciaDeclarada, notas
    } = req.body;

    // Efectivo esperado = saldo inicial + ventas en efectivo - gastos de la caja
    const efectivoEsperado = parseFloat(caja.saldoInicial) + totales.totalEfectivo - totales.gastosCaja;

    // El efectivo contado al cierre puede declararse como retirado + lo que
    // queda para el proximo turno (estilo gestionQ24), o como un unico monto.
    const declaraSplit = efectivoRetirado !== undefined || dineroSiguiente !== undefined;
    const efectivoDeclarado = declaraSplit
      ? (Number(efectivoRetirado || 0) + Number(dineroSiguiente || 0))
      : (efectivoReal !== undefined ? Number(efectivoReal) : null);

    // Diferencia total: lo declarado (efectivo + metodos virtuales) menos lo
    // que el sistema esperaba (ventas + saldo inicial - gastos de caja).
    const totalDeclarado = (efectivoDeclarado || 0)
      + Number(tarjetaDeclarada || 0) + Number(mercadopagoDeclarada || 0) + Number(transferenciaDeclarada || 0);
    const totalSistema = totales.totalVentas + parseFloat(caja.saldoInicial) - totales.gastosCaja;
    const declaroAlgo = declaraSplit || tarjetaDeclarada !== undefined || efectivoReal !== undefined;
    const diferencia = declaroAlgo ? totalDeclarado - totalSistema : 0;

    await caja.update({
      estado: 'cerrada',
      totalEfectivo: totales.totalEfectivo,
      totalTarjeta: totales.totalTarjeta,
      totalTransferencia: totales.totalTransferencia,
      totalMercadopago: totales.totalMercadopago,
      totalVentas: totales.totalVentas,
      efectivoRetirado: Number(efectivoRetirado || 0),
      dineroSiguiente: Number(dineroSiguiente || 0),
      tarjetaDeclarada: Number(tarjetaDeclarada || 0),
      mercadopagoDeclarada: Number(mercadopagoDeclarada || 0),
      transferenciaDeclarada: Number(transferenciaDeclarada || 0),
      diferencia,
      notas: notas || '',
      cierreAt: new Date(),
      usuarioCierreId: req.usuario?.id || null
    });

    // Al cerrar, los operadores dejan de estar asociados
    await CajaUsuario.destroy({ where: { cajaId: id } });

    res.json({ success: true, caja: { ...caja.toJSON(), ...totales, efectivoEsperado } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
