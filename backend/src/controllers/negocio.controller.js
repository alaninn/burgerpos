const { Negocio, Usuario, Producto, Categoria, Repartidor, PagoHistorial, ErrorFrontend, sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { obtenerPlanes } = require('../middleware/checkPlan');

exports.listar = async (req, res) => {
  try {
    const negocios = await Negocio.findAll({ include: [{ model: Usuario, as: 'usuarios', attributes: ['id','nombre','email','rol'] }] });
    res.json({ success: true, negocios });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, slug: slugInput, plan, telefono, direccion, ciudad, adminNombre, adminUsername, adminEmail, adminPassword } = req.body;

    const slug = (slugInput || nombre).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    const negocio = await Negocio.create({ nombre, slug, plan, telefono, direccion, ciudad });

    const hash = await bcrypt.hash(adminPassword || 'admin123', 10);
    const admin = await Usuario.create({
      nombre: adminNombre || 'Admin',
      username: (adminUsername || adminEmail || slug).toLowerCase().trim(),
      email: adminEmail || null,
      password: hash,
      rol: 'admin',
      negocioId: negocio.id
    });

    res.status(201).json({ success: true, negocio, admin: { id: admin.id, nombre: admin.nombre, email: admin.email } });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Ya existe un negocio con ese slug o email' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const negocio = await Negocio.findByPk(req.params.id);
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    res.json({ success: true, negocio });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Campos que puede editar el admin de su propio negocio
const CAMPOS_ADMIN = ['nombre', 'logo', 'telefono', 'direccion', 'ciudad', 'configuracion'];
// Campos adicionales exclusivos del superadmin
const CAMPOS_SUPERADMIN = [...CAMPOS_ADMIN, 'slug', 'plan', 'activo', 'vencimiento'];

exports.actualizar = async (req, res) => {
  try {
    const negocio = await Negocio.findByPk(req.params.id);
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const esSuperadmin = req.usuario.rol === 'superadmin';
    if (!esSuperadmin && req.usuario.negocioId !== negocio.id) {
      return res.status(403).json({ success: false, message: 'Sin acceso a este negocio' });
    }

    // Whitelist de campos según el rol
    const permitidos = esSuperadmin ? CAMPOS_SUPERADMIN : CAMPOS_ADMIN;
    const data = {};
    for (const campo of permitidos) {
      if (req.body[campo] !== undefined) data[campo] = req.body[campo];
    }

    await negocio.update(data);
    res.json({ success: true, negocio });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleActivo = async (req, res) => {
  try {
    const negocio = await Negocio.findByPk(req.params.id);
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    await negocio.update({ activo: !negocio.activo });
    res.json({ success: true, data: negocio });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.metricas = async (req, res) => {
  try {
    const negocios = await Negocio.findAll({ attributes: ['id','plan','activo','vencimiento','createdAt'] });

    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const hace30 = new Date(ahora - 30 * 24 * 60 * 60 * 1000);
    const en30 = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activos = negocios.filter(n => n.activo);
    const inactivos = negocios.filter(n => !n.activo);

    // Precios desde la DB (planes_config editables)
    const planes = await obtenerPlanes();
    const precioDe = (plan) => planes[plan]?.precio || 0;

    // MRR: suma de precios de planes activos
    const mrr = activos.reduce((acc, n) => acc + precioDe(n.plan), 0);

    // Distribución por plan
    const porPlan = {};
    for (const plan of Object.keys(planes)) {
      porPlan[plan] = {
        total: negocios.filter(n => n.plan === plan).length,
        activos: activos.filter(n => n.plan === plan).length,
        mrr: activos.filter(n => n.plan === plan).length * precioDe(plan),
        precio: precioDe(plan),
      };
    }

    // Nuevos este mes
    const nuevosEsteMes = negocios.filter(n => new Date(n.createdAt) >= inicioMes).length;

    // Vencimientos próximos (próximos 30 días, solo activos)
    const proximosAVencer = activos.filter(n =>
      n.vencimiento && new Date(n.vencimiento) > ahora && new Date(n.vencimiento) <= en30
    ).length;

    // Vencidos (vencimiento pasado y aún activos)
    const vencidos = activos.filter(n =>
      n.vencimiento && new Date(n.vencimiento) < ahora
    ).length;

    // Churn rate (inactivos / total * 100)
    const churnRate = negocios.length > 0 ? ((inactivos.length / negocios.length) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      metricas: {
        total: negocios.length,
        activos: activos.length,
        inactivos: inactivos.length,
        mrr,
        porPlan,
        nuevosEsteMes,
        proximosAVencer,
        vencidos,
        churnRate: parseFloat(churnRate),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /negocios/:id/renovar — registra un pago y extiende el vencimiento.
// Si el negocio sigue vigente suma desde el vencimiento actual; si ya vencio,
// suma desde hoy.
exports.renovar = async (req, res) => {
  try {
    const negocio = await Negocio.findByPk(req.params.id);
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const dias = parseInt(req.body.dias) || 30;
    const monto = parseFloat(req.body.monto) || 0;
    const { metodoPago, observaciones } = req.body;

    const ahora = new Date();
    const base = negocio.vencimiento && new Date(negocio.vencimiento) > ahora
      ? new Date(negocio.vencimiento)
      : ahora;
    const nuevoVencimiento = new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);

    await negocio.update({ vencimiento: nuevoVencimiento, activo: true });

    const pago = await PagoHistorial.create({
      negocioId: negocio.id,
      dias,
      monto,
      metodoPago: metodoPago || null,
      observaciones: observaciones || null,
      tipo: monto > 0 ? 'pago' : 'renovacion'
    });

    res.json({ success: true, negocio, pago });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /negocios/:id/historial-pagos
exports.historialPagos = async (req, res) => {
  try {
    const pagos = await PagoHistorial.findAll({
      where: { negocioId: req.params.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json({ success: true, pagos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /negocios/:id/salud — actividad, errores y tamaño (solo superadmin)
exports.salud = async (req, res) => {
  try {
    const { Pedido } = require('../models');
    const negocio = await Negocio.findByPk(req.params.id, { attributes: ['id', 'nombre', 'createdAt'] });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const hace24h = new Date(ahora - 24 * 60 * 60 * 1000);

    const [ultimoPedido, pedidosHoy, errores24h, usuariosActivos] = await Promise.all([
      Pedido.findOne({ where: { negocioId: negocio.id }, order: [['createdAt', 'DESC']], attributes: ['createdAt'] }),
      Pedido.count({ where: { negocioId: negocio.id, createdAt: { [Op.gte]: inicioHoy } } }),
      ErrorFrontend.count({ where: { negocioId: negocio.id, createdAt: { [Op.gte]: hace24h } } }),
      Usuario.count({ where: { negocioId: negocio.id, ultimoAcceso: { [Op.gte]: hace24h } } }),
    ]);

    // Tamaño en disco de las tablas principales (informativo, global)
    let almacenamiento = null;
    try {
      const [r] = await sequelize.query(`
        SELECT pg_size_pretty(pg_total_relation_size('pedidos')) AS pedidos,
               pg_size_pretty(pg_total_relation_size('productos')) AS productos,
               pg_size_pretty(pg_total_relation_size('items_pedido')) AS items
      `);
      almacenamiento = r[0];
    } catch { /* opcional */ }

    const ultimaActividad = ultimoPedido?.createdAt || null;
    const diasSinActividad = ultimaActividad
      ? Math.floor((ahora - new Date(ultimaActividad)) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      success: true,
      salud: {
        ultimaActividad,
        diasSinActividad,
        pedidosHoy,
        errores24h,
        usuariosActivos24h: usuariosActivos,
        estado: diasSinActividad === null ? 'nunca_usado' : diasSinActividad > 7 ? 'inactivo' : 'activo',
        almacenamiento
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /negocios/:id — borrado total en cascada (solo superadmin).
// Elimina todas las tablas hijas en orden de FK dentro de una transaccion.
exports.eliminar = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const negocio = await Negocio.findByPk(req.params.id, { transaction: t });
    if (!negocio) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    }

    const negocioId = negocio.id;
    // Orden: primero tablas nietas (dependen de hijas), despues hijas, al final el negocio.
    // Las que no filtran por negocioId directo se borran via subquery.
    const pasos = [
      `DELETE FROM items_pedido WHERE "pedidoId" IN (SELECT id FROM pedidos WHERE "negocioId" = :id)`,
      `DELETE FROM comprobantes_electronicos WHERE "negocioId" = :id`,
      `DELETE FROM pedidos WHERE "negocioId" = :id`,
      `DELETE FROM receta_ingredientes WHERE "recetaId" IN (SELECT id FROM recetas WHERE "negocioId" = :id)`,
      `DELETE FROM recetas WHERE "negocioId" = :id`,
      `DELETE FROM compra_items WHERE "compraId" IN (SELECT id FROM compras WHERE "negocioId" = :id)`,
      `DELETE FROM compras WHERE "negocioId" = :id`,
      `DELETE FROM gastos WHERE "negocioId" = :id`,
      `DELETE FROM proveedores WHERE "negocioId" = :id`,
      `DELETE FROM producto_variantes WHERE "productoId" IN (SELECT id FROM productos WHERE "negocioId" = :id)`,
      `DELETE FROM adicionales WHERE "grupoAdicionalId" IN (SELECT id FROM grupos_adicionales WHERE "negocioId" = :id)`,
      `DELETE FROM grupos_adicionales WHERE "negocioId" = :id`,
      `DELETE FROM productos WHERE "negocioId" = :id`,
      `DELETE FROM categorias WHERE "negocioId" = :id`,
      `DELETE FROM descuentos WHERE "negocioId" = :id`,
      `DELETE FROM clientes WHERE "negocioId" = :id`,
      `DELETE FROM repartidores WHERE "negocioId" = :id`,
      `DELETE FROM cajas WHERE "negocioId" = :id`,
      `DELETE FROM errores_frontend WHERE "negocioId" = :id`,
      `DELETE FROM pagos_historial WHERE "negocioId" = :id`,
      `DELETE FROM alertas WHERE "negocioId" = :id`,
      `DELETE FROM tickets_soporte WHERE "negocioId" = :id`,
      `DELETE FROM usuarios WHERE "negocioId" = :id`,
    ];

    for (const sql of pasos) {
      try {
        await sequelize.query(sql, { replacements: { id: negocioId }, transaction: t });
      } catch (e) {
        // 42P01 = tabla inexistente, 42703 = columna inexistente: se ignoran
        // para tolerar diferencias de esquema entre entornos
        if (e.parent?.code !== '42P01' && e.parent?.code !== '42703') throw e;
      }
    }

    // Tablas con nombres variables entre entornos (credenciales/config)
    for (const tabla of ['mercadopago_credentials', 'arca_credentials', 'whatsapp_configs', 'tickets_acceso_wsaa']) {
      try {
        await sequelize.query(`DELETE FROM ${tabla} WHERE "negocioId" = :id`, { replacements: { id: negocioId }, transaction: t });
      } catch (e) {
        if (e.parent?.code !== '42P01' && e.parent?.code !== '42703') throw e;
      }
    }

    await negocio.destroy({ transaction: t });
    await t.commit();

    console.warn(`Negocio eliminado por superadmin: ${negocio.nombre} (${negocioId})`);
    res.json({ success: true, message: 'Negocio eliminado definitivamente' });
  } catch (err) {
    if (!t.finished) await t.rollback().catch(() => {});
    console.error('Error eliminando negocio:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uso = async (req, res) => {
  try {
    const negocio = await Negocio.findByPk(req.params.id, { attributes: ['id', 'plan', 'nombre', 'vencimiento'] });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    // Solo el propio negocio o superadmin puede ver esto
    if (req.usuario.rol !== 'superadmin' && req.usuario.negocioId !== negocio.id) {
      return res.status(403).json({ success: false, message: 'Sin acceso' });
    }

    const planes = await obtenerPlanes();
    const planData = planes[negocio.plan] || planes.estandar;

    const [productos, categorias, repartidores, operadores] = await Promise.all([
      Producto.count({ where: { negocioId: negocio.id } }),
      Categoria.count({ where: { negocioId: negocio.id } }),
      Repartidor.count({ where: { negocioId: negocio.id } }),
      Usuario.count({ where: { negocioId: negocio.id, rol: 'operador' } }),
    ]);

    // WhatsApp de contacto para upgrades (configurable por el superadmin)
    let contactoWhatsApp = null;
    try {
      const { PlatformConfig } = require('../models');
      const cfg = await PlatformConfig.findOne({ where: { key: 'contacto_whatsapp' } });
      contactoWhatsApp = cfg?.value || null;
    } catch { /* opcional */ }

    res.json({
      success: true,
      plan: negocio.plan,
      planNombre: planData.nombre,
      precio: planData.precio,
      vencimiento: negocio.vencimiento,
      limites: planData.limites,
      accesos: planData.accesos,
      modulos: planData.modulos || [],
      contactoWhatsApp,
      uso: { productos, categorias, repartidores, operadores },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
