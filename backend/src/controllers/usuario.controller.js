const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');

exports.listar = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      where: { negocioId: req.params.negocioId },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'ASC']]
    });
    res.json({ success: true, usuarios });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, username, email, password, rol, telefono, activo } = req.body;
    const hash = await bcrypt.hash(password || 'burgerpos123', 10);
    const usuario = await Usuario.create({
      nombre,
      username,
      email: email || null,
      password: hash,
      rol: rol || 'operador',
      telefono: telefono || null,
      activo: activo !== undefined ? activo : true,
      negocioId: req.params.negocioId
    });
    res.status(201).json({ success: true, usuario: { id: usuario.id, nombre: usuario.nombre, username: usuario.username, email: usuario.email, rol: usuario.rol, telefono: usuario.telefono, activo: usuario.activo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'No encontrado' });
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }
    await usuario.update(updates);
    const { password: _, ...data } = usuario.toJSON();
    res.json({ success: true, usuario: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'No encontrado' });
    await usuario.destroy();
    res.json({ success: true, message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
