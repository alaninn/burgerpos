const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { login, me, cambiarPassword, impersonate } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

// Limite estricto para el login: frena la fuerza bruta de contrasenas
// (los intentos exitosos no cuentan para no molestar al uso normal).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de acceso. Esperá unos minutos.' }
});

router.post('/login', loginLimiter, login);
router.get('/me', protect, me);
router.put('/password', protect, cambiarPassword);
router.post('/impersonate', protect, impersonate);

module.exports = router;