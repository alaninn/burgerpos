// =============================================
// SuperAdmin: administracion de la plataforma.
// Planes editables, finanzas/cobros, alertas, backups y tickets de soporte.
// =============================================

const { Op } = require('sequelize');
const { PlanConfig, PagoHistorial, Alerta, TicketSoporte, Negocio, Usuario, Pedido, sequelize } = require('../models');
const { invalidarCachePlanes, obtenerPlanes } = require('../middleware/checkPlan');
const backupService = require('../services/backupService');
const { generarAlertas } = require('../services/alertasService');

// ── Planes ────────────────────────────────────────────────

// GET /api/superadmin/planes
exports.listarPlanes = async (req, res) => {
  try {
    const planes = await obtenerPlanes();
    res.json({ success: true, planes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/superadmin/planes/:plan
exports.actualizarPlan = async (req, res) => {
  try {
    const fila = await PlanConfig.findByPk(req.params.plan);
    if (!fila) return res.status(404).json({ success: false, message: 'Plan no encontrado' });

    const { nombre, precio, limites, accesos, modulos } = req.body;
    await fila.update({
      nombre: nombre !== undefined ? nombre : fila.nombre,
      precio: precio !== undefined ? precio : fila.precio,
      limites: limites !== undefined ? limites : fila.limites,
      accesos: accesos !== undefined ? accesos : fila.accesos,
      modulos: modulos !== undefined ? modulos : fila.modulos
    });
    invalidarCachePlanes();

    res.json({ success: true, plan: fila });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Finanzas / Cobros ─────────────────────────────────────

// GET /api/superadmin/finanzas
exports.finanzas = async (req, res) => {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    const en7 = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [cobradoMes, cobradoHistorico, cobrado30, pagosMes, negocios, planes, ultimosPagos] = await Promise.all([
      PagoHistorial.sum('monto', { where: { createdAt: { [Op.gte]: inicioMes } } }),
      PagoHistorial.sum('monto'),
      PagoHistorial.sum('monto', { where: { createdAt: { [Op.gte]: hace30 } } }),
      PagoHistorial.count({ where: { createdAt: { [Op.gte]: inicioMes } } }),
      Negocio.findAll({ attributes: ['id', 'plan', 'activo', 'vencimiento'] }),
      obtenerPlanes(),
      PagoHistorial.findAll({
        include: [{ model: Negocio, as: 'negocio', attributes: ['id', 'nombre'] }],
        order: [['createdAt', 'DESC']],
        limit: 8
      })
    ]);

    const activos = negocios.filter(n => n.activo);
    const ingresoEstimado = activos.reduce((acc, n) => acc + (planes[n.plan]?.precio || 0), 0);

    res.json({
      success: true,
      finanzas: {
        cobradoMes: parseFloat(cobradoMes) || 0,
        cobradoHistorico: parseFloat(cobradoHistorico) || 0,
        cobrado30dias: parseFloat(cobrado30) || 0,
        pagosMes,
        ingresoEstimado,
        negocios: {
          activos: activos.length,
          vencidos: activos.filter(n => n.vencimiento && new Date(n.vencimiento) < ahora).length,
          porVencer7dias: activos.filter(n => n.vencimiento && new Date(n.vencimiento) >= ahora && new Date(n.vencimiento) <= en7).length,
        },
        ultimosPagos
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/superadmin/top-negocios — ranking por facturación (últimos 30 días)
exports.topNegocios = async (req, res) => {
  try {
    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filas = await Pedido.findAll({
      attributes: [
        'negocioId',
        [sequelize.fn('SUM', sequelize.col('total')), 'facturado'],
        [sequelize.fn('COUNT', sequelize.col('Pedido.id')), 'pedidos'],
      ],
      where: { createdAt: { [Op.gte]: hace30 }, estado: { [Op.ne]: 'cancelado' } },
      group: ['negocioId'],
      order: [[sequelize.literal('facturado'), 'DESC']],
      limit: 10,
      raw: true,
    });

    const negocios = await Negocio.findAll({
      where: { id: { [Op.in]: filas.map(f => f.negocioId) } },
      attributes: ['id', 'nombre', 'plan'],
      raw: true,
    });
    const porId = Object.fromEntries(negocios.map(n => [n.id, n]));

    res.json({
      success: true,
      ranking: filas.map(f => ({
        negocioId: f.negocioId,
        nombre: porId[f.negocioId]?.nombre || 'Negocio eliminado',
        plan: porId[f.negocioId]?.plan || null,
        facturado: parseFloat(f.facturado) || 0,
        pedidos: parseInt(f.pedidos) || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Alertas ───────────────────────────────────────────────

// GET /api/superadmin/alertas
exports.listarAlertas = async (req, res) => {
  try {
    const alertas = await Alerta.findAll({
      where: { resuelta: false },
      include: [{ model: Negocio, as: 'negocio', attributes: ['id', 'nombre'] }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json({ success: true, alertas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/superadmin/alertas/:id/resolver
exports.resolverAlerta = async (req, res) => {
  try {
    const alerta = await Alerta.findByPk(req.params.id);
    if (!alerta) return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
    await alerta.update({ resuelta: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/superadmin/generar-alertas (manual, para probar)
exports.generarAlertasManual = async (req, res) => {
  try {
    const creadas = await generarAlertas();
    res.json({ success: true, creadas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Backups ───────────────────────────────────────────────

// GET /api/superadmin/backups
exports.listarBackups = (req, res) => {
  try {
    res.json({ success: true, backups: backupService.listarBackups() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/superadmin/backups — crear ahora
exports.crearBackup = async (req, res) => {
  try {
    const r = await backupService.hacerBackup();
    res.json({ success: true, ...r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/superadmin/backups/:archivo/descargar
exports.descargarBackup = (req, res) => {
  try {
    const ruta = backupService.rutaBackup(req.params.archivo);
    if (!ruta) return res.status(404).json({ success: false, message: 'Backup no encontrado' });
    res.download(ruta);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Contacto de la plataforma ─────────────────────────────

const { PlatformConfig } = require('../models');

// GET /api/superadmin/contacto
exports.obtenerContacto = async (req, res) => {
  try {
    const cfg = await PlatformConfig.findOne({ where: { key: 'contacto_whatsapp' } });
    res.json({ success: true, whatsapp: cfg?.value || '' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/superadmin/contacto
exports.guardarContacto = async (req, res) => {
  try {
    const whatsapp = String(req.body.whatsapp || '').replace(/\D/g, '');
    const [cfg] = await PlatformConfig.findOrCreate({
      where: { key: 'contacto_whatsapp' },
      defaults: { value: whatsapp, descripcion: 'WhatsApp de contacto para upgrades de plan' }
    });
    await cfg.update({ value: whatsapp });
    res.json({ success: true, whatsapp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Tickets de soporte (lado superadmin) ──────────────────

// GET /api/superadmin/tickets?estado=abierto
exports.listarTickets = async (req, res) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    const tickets = await TicketSoporte.findAll({
      where,
      include: [
        { model: Negocio, as: 'negocio', attributes: ['id', 'nombre'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/superadmin/tickets/:id — responder / cambiar estado
exports.actualizarTicket = async (req, res) => {
  try {
    const ticket = await TicketSoporte.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

    const { estado, respuesta } = req.body;
    const data = {};
    if (estado) data.estado = estado;
    if (respuesta !== undefined) data.respuesta = respuesta;
    if (estado === 'resuelto') data.fechaResolucion = new Date();

    await ticket.update(data);
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
