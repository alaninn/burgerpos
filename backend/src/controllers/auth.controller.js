const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Usuario, Negocio } = require('../models');

const generarToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });

    const usuario = await Usuario.findOne({
      where: { email: email.toLowerCase() },
      include: [{ model: Negocio, as: 'negocio', attributes: ['id','nombre','slug','logo','configuracion','plan'] }]
    });

    if (!usuario || !usuario.activo)
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    const passwordOk = await bcrypt.compare(password, usuario.password);
    if (!passwordOk)
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    await usuario.update({ ultimoAcceso: new Date() });

    res.json({
      success: true,
      token: generarToken(usuario.id),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        negocioId: usuario.negocioId,
        negocio: usuario.negocio
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

exports.me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Negocio, as: 'negocio' }]
    });
    res.json({ success: true, usuario });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

exports.cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const usuario = await Usuario.findByPk(req.usuario.id);
    const ok = await bcrypt.compare(passwordActual, usuario.password);
    if (!ok) return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(passwordNueva, 10);
    await usuario.update({ password: hash });
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};