// =============================================
// Endpoint publico de salud: recepcion de errores de pantalla (frontend).
// SIN token obligatorio (el error puede ocurrir antes del login); si hay
// token se usa para asociar negocio/usuario.
// =============================================
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { ErrorFrontend, Usuario } = require('../models');

// POST /api/salud/error-frontend
router.post('/error-frontend', async (req, res) => {
  try {
    const { mensaje, stack, url } = req.body || {};
    if (!mensaje) return res.status(400).json({ ok: false });

    // Identificar usuario/negocio si viene token (opcional)
    let negocioId = null, usuarioId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        usuarioId = decoded.id || null;
        if (usuarioId) {
          const usuario = await Usuario.findByPk(usuarioId, { attributes: ['id', 'negocioId'] });
          negocioId = usuario?.negocioId || null;
        }
      } catch { /* token invalido: se registra como anonimo */ }
    }

    await ErrorFrontend.create({
      negocioId,
      usuarioId,
      mensaje: String(mensaje).slice(0, 1000),
      stack: String(stack || '').slice(0, 4000),
      url: String(url || '').slice(0, 500),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
    });

    console.error(`Error frontend reportado [negocio ${negocioId ?? '-'}]: ${String(mensaje).slice(0, 200)}`);
    res.json({ ok: true });
  } catch {
    // Nunca romper por el propio reporte de errores
    res.json({ ok: false });
  }
});

module.exports = router;
