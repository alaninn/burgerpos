const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/pago.controller')

router.post('/iniciar-pago-mp', ctrl.iniciarPagoMP)
router.post('/webhooks/mercadopago', ctrl.webhookMP)

module.exports = router
