// =============================================
// Tickets de soporte del negocio: crear y ver los propios.
// El superadmin los responde desde su panel (superadminPlataforma.routes).
// =============================================
const router = require('express').Router({ mergeParams: true });
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const { TicketSoporte } = require('../models');

router.use(protect, perteneceAlNegocio);

// GET /api/negocios/:negocioId/soporte — tickets del negocio
router.get('/', async (req, res) => {
  try {
    const tickets = await TicketSoporte.findAll({
      where: { negocioId: req.params.negocioId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/negocios/:negocioId/soporte — crear ticket
router.post('/', async (req, res) => {
  try {
    const { asunto, mensaje } = req.body;
    if (!asunto?.trim() || !mensaje?.trim()) {
      return res.status(400).json({ success: false, message: 'Asunto y mensaje son obligatorios' });
    }
    const ticket = await TicketSoporte.create({
      negocioId: req.params.negocioId,
      usuarioId: req.usuario.id,
      asunto: asunto.trim().slice(0, 200),
      mensaje: mensaje.trim().slice(0, 4000)
    });
    res.status(201).json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
