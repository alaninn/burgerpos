const { Negocio, Usuario, Producto, Categoria, Repartidor } = require('../models');
const bcrypt = require('bcryptjs');
const { PLANES, PRECIOS } = require('../config/planes');

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
    const { nombre, slug: slugInput, plan, telefono, direccion, ciudad, adminNombre, adminEmail, adminPassword } = req.body;

    const slug = (slugInput || nombre).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    const negocio = await Negocio.create({ nombre, slug, plan, telefono, direccion, ciudad });

    const hash = await bcrypt.hash(adminPassword || 'admin123', 10);
    const admin = await Usuario.create({
      nombre: adminNombre || 'Admin',
      email: adminEmail,
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

exports.actualizar = async (req, res) => {
  try {
    const negocio = await Negocio.findByPk(req.params.id);
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    await negocio.update(req.body);
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

    // MRR: suma de precios de planes activos
    const mrr = activos.reduce((acc, n) => acc + (PRECIOS[n.plan] || 0), 0);

    // Distribución por plan
    const porPlan = {};
    for (const plan of Object.keys(PRECIOS)) {
      porPlan[plan] = {
        total: negocios.filter(n => n.plan === plan).length,
        activos: activos.filter(n => n.plan === plan).length,
        mrr: activos.filter(n => n.plan === plan).length * PRECIOS[plan],
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

exports.uso = async (req, res) => {
  try {
    const negocio = await Negocio.findByPk(req.params.id, { attributes: ['id', 'plan', 'nombre', 'vencimiento'] });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    // Solo el propio negocio o superadmin puede ver esto
    if (req.usuario.rol !== 'superadmin' && req.usuario.negocioId !== negocio.id) {
      return res.status(403).json({ success: false, message: 'Sin acceso' });
    }

    const planData = PLANES[negocio.plan] || PLANES.estandar;

    const [productos, categorias, repartidores, operadores] = await Promise.all([
      Producto.count({ where: { negocioId: negocio.id } }),
      Categoria.count({ where: { negocioId: negocio.id } }),
      Repartidor.count({ where: { negocioId: negocio.id } }),
      Usuario.count({ where: { negocioId: negocio.id, rol: 'operador' } }),
    ]);

    res.json({
      success: true,
      plan: negocio.plan,
      planNombre: planData.nombre,
      vencimiento: negocio.vencimiento,
      limites: planData.limites,
      accesos: planData.accesos,
      uso: { productos, categorias, repartidores, operadores },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
