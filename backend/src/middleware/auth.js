const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = await Usuario.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    if (!req.usuario || !req.usuario.activo) {
      return res.status(401).json({ success: false, message: 'Usuario no válido' });
    }
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const superAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado' });
  }
  next();
};

const perteneceAlNegocio = (req, res, next) => {
  const negocioId = req.params.negocioId || req.body.negocioId || req.query.negocioId;
  if (req.usuario.rol === 'superadmin') return next();
  if (req.usuario.negocioId !== negocioId) {
    return res.status(403).json({ success: false, message: 'Sin acceso a este negocio' });
  }
  next();
};

module.exports = { protect, superAdmin, perteneceAlNegocio };