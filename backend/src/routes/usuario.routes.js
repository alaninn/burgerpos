// =============================================
// Usuarios a nivel plataforma (solo superadmin).
// El superadmin gestiona los ADMINS de cada negocio (y su propia cuenta).
// Los usuarios internos de un negocio (operadores, repartidores) se
// gestionan desde el panel del negocio (negocio-usuario.routes).
// =============================================
const router = require('express').Router();
const { Op } = require('sequelize');
const { protect, superAdmin } = require('../middleware/auth');
const { Usuario, Negocio } = require('../models');
const bcrypt = require('bcryptjs');

router.use(protect, superAdmin);

// Roles gestionables desde el panel de superadmin
const ROLES_PLATAFORMA = ['superadmin', 'admin'];

router.get('/', async (req, res) => {
  const usuarios = await Usuario.findAll({
    where: { rol: { [Op.in]: ROLES_PLATAFORMA } },
    attributes: { exclude: ['password'] },
    include: [{ model: Negocio, as: 'negocio', attributes: ['id', 'nombre'] }],
    order: [['rol', 'DESC'], ['nombre', 'ASC']]
  });
  res.json({ success: true, data: usuarios });
});

router.post('/', async (req, res) => {
  try {
    const rol = ROLES_PLATAFORMA.includes(req.body.rol) ? req.body.rol : 'admin';
    if (rol === 'admin' && !req.body.negocioId) {
      return res.status(400).json({ success: false, message: 'El admin debe estar asignado a un negocio' });
    }
    const hash = await bcrypt.hash(req.body.password, 10);
    const u = await Usuario.create({ ...req.body, rol, password: hash });
    res.status(201).json({ success: true, data: { id: u.id, nombre: u.nombre, username: u.username, email: u.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const u = await Usuario.findOne({ where: { id: req.params.id, rol: { [Op.in]: ROLES_PLATAFORMA } } });
    if (!u) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const data = { ...req.body };
    if (data.rol && !ROLES_PLATAFORMA.includes(data.rol)) delete data.rol;
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    } else {
      delete data.password;
    }

    await u.update(data);
    res.json({ success: true, data: { id: u.id, nombre: u.nombre, username: u.username, email: u.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const u = await Usuario.findOne({ where: { id: req.params.id, rol: { [Op.in]: ROLES_PLATAFORMA } } });
    if (!u) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    if (u.rol === 'superadmin') {
      return res.status(400).json({ success: false, message: 'La cuenta de superadmin no se puede eliminar desde acá' });
    }
    await u.destroy();
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
