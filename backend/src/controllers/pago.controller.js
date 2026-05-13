const MercadoPagoService = require('../services/mercadoPagoService')
const mercadoPagoOAuthService = require('../services/mercadoPagoOAuthService')
const { Pedido, Negocio, ItemPedido } = require('../models')

exports.iniciarPagoMP = async (req, res) => {
  try {
    const { pedidoId } = req.body

    const pedido = await Pedido.findByPk(pedidoId, {
      include: [
        { model: ItemPedido, as: 'items' },
        { model: Negocio, as: 'negocio' }
      ]
    })

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })

    // NUEVO: Obtener access token válido desde OAuth (con refresh automático)
    let accessToken
    try {
      accessToken = await mercadoPagoOAuthService.getValidAccessToken(pedido.negocio.id)
    } catch (error) {
      // Fallback: Intentar credenciales legacy si OAuth no está configurado
      const legacyCredentials = pedido.negocio.configuracion?.metodosPago?.mercado_pago
      if (legacyCredentials?.accessToken) {
        console.warn(`⚠ Usando credenciales legacy para negocio ${pedido.negocio.id}`)
        accessToken = legacyCredentials.accessToken
      } else {
        return res.status(400).json({
          error: 'MercadoPago no vinculado. Vinculá tu cuenta en Configuraciones.'
        })
      }
    }

    const mpService = new MercadoPagoService(accessToken)
    const preferencia = await mpService.crearPreferencia(pedido, pedido.negocio)

    // Guardar ID de preferencia en el pedido
    await pedido.update({
      transaccionMPData: { preferenceId: preferencia.id }
    })

    res.json({
      preferenceId: preferencia.id,
      initPoint: preferencia.init_point // OAuth siempre usa producción cuando está configurado
    })
  } catch (error) {
    console.error('Error iniciando pago MP:', error)
    res.status(500).json({ error: error.message })
  }
}

exports.webhookMP = async (req, res) => {
  try {
    const { type, data } = req.body

    if (type === 'payment') {
      const paymentId = data.id

      // Buscar el pedido por external_reference
      const pedido = await Pedido.findOne({
        where: { id: data.external_reference },
        include: [{ model: Negocio, as: 'negocio' }]
      })

      if (!pedido) {
        console.log('Pedido no encontrado para payment:', paymentId)
        return res.sendStatus(404)
      }

      // NUEVO: Obtener access token desde OAuth
      let accessToken
      try {
        accessToken = await mercadoPagoOAuthService.getValidAccessToken(pedido.negocio.id)
      } catch (error) {
        // Fallback a credenciales legacy
        const legacyCredentials = pedido.negocio.configuracion?.metodosPago?.mercado_pago
        if (legacyCredentials?.accessToken) {
          console.warn(`⚠ Webhook usando credenciales legacy para negocio ${pedido.negocio.id}`)
          accessToken = legacyCredentials.accessToken
        } else {
          console.log('No hay credenciales MP para el negocio')
          return res.sendStatus(400)
        }
      }

      const mpService = new MercadoPagoService(accessToken)
      const payment = await mpService.verificarPago(paymentId)

      // Actualizar estado según resultado
      await pedido.update({
        transaccionMPId: paymentId.toString(),
        transaccionMPEstado: payment.status,
        transaccionMPData: payment,
        cobrado: payment.status === 'approved'
      })

      // Si fue aprobado, cambiar estado del pedido
      if (payment.status === 'approved' && pedido.estado === 'nuevo') {
        await pedido.update({ estado: 'en_preparacion' })
      }

      console.log(`Webhook MP procesado: pedido ${pedido.id}, estado ${payment.status}`)
    }

    res.sendStatus(200)
  } catch (error) {
    console.error('Error en webhook MP:', error)
    res.sendStatus(500)
  }
}
