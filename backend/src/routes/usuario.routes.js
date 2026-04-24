const router = require('express').Router();
const { protect, superAdmin } = require('../middleware/auth');
const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');

router.use(protect);

router.get('/', superAdmin, async (req, res) => {
  const usuarios = await Usuario.findAll({ attributes: { exclude: ['password'] } });
  res.json({ success: true, data: usuarios });
});

router.post('/', superAdmin, async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const u = await Usuario.create({ ...req.body, password: hash });
    res.status(201).json({ success: true, data: { id: u.id, nombre: u.nombre, email: u.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;