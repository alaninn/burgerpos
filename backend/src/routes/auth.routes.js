const router = require('express').Router();
const { login, me, cambiarPassword, impersonate } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, me);
router.put('/password', protect, cambiarPassword);
router.post('/impersonate', protect, impersonate);

module.exports = router;