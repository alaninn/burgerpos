const router = require('express').Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

router.post('/', protect, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió ninguna imagen' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

module.exports = router;
