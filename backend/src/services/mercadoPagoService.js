const mercadopago = require('mercadopago')

class MercadoPagoService {
  constructor(accessToken) {
    this.client = new mercadopago.MercadoPagoConfig({
      accessToken: accessToken
    })
  }

  async crearPreferencia(pedido, negocio) {
    const preference = new mercadopago.Preference(this.client)

    const items = pedido.items.map(item => ({
      title: item.nombre,
      quantity: item.cantidad,
      unit_price: parseFloat(item.precioUnitario || item.precioVenta || item.precio),
      currency_id: 'ARS'
    }))

    // Agregar costos adicionales
    if (pedido.costoEnvio > 0) {
      items.push({
        title: 'Envío',
        quantity: 1,
        unit_price: parseFloat(pedido.costoEnvio),
        currency_id: 'ARS'
      })
    }

    // Obtener primera URL si FRONTEND_URL tiene múltiples (separadas por coma)
    const frontendUrl = process.env.FRONTEND_URL.split(',')[0].trim()

    const body = {
      items,
      back_urls: {
        success: `${frontendUrl}/menu/${negocio.slug}/pago-exitoso`,
        failure: `${frontendUrl}/menu/${negocio.slug}/pago-fallido`,
        pending: `${frontendUrl}/menu/${negocio.slug}/pago-pendiente`
      },
      // auto_return: 'approved',  // No funciona con OAuth test credentials
      external_reference: pedido.id.toString(),
      notification_url: `${process.env.BACKEND_URL}/api/pagos/webhooks/mercadopago`,
      payer: {
        name: pedido.clienteNombre,
        phone: { number: pedido.clienteTelefono },
        address: { street_name: pedido.clienteDireccion || '' }
      }
    }

    console.log('🔍 Datos enviados a MercadoPago:');
    console.log(JSON.stringify(body, null, 2));

    const result = await preference.create({ body })
    return result
  }

  async verificarPago(paymentId) {
    const payment = new mercadopago.Payment(this.client)
    const result = await payment.get({ id: paymentId })
    return result
  }
}

module.exports = MercadoPagoService
