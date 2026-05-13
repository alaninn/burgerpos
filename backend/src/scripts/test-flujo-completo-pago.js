const axios = require('axios');
const { sequelize, Pedido, Cliente, Producto, Negocio, MercadoPagoCredential } = require('../models');
const encryptionService = require('../services/encryptionService');

const API_URL = 'http://localhost:3001/api';
let negocio = null;
let productos = [];

async function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

async function setupCredencialesReales() {
  log('🔧', 'Paso 1: Verificar credenciales de MercadoPago...');

  try {
    // Obtener el negocio
    negocio = await Negocio.findOne({ where: { slug: 'burger-demo' } });

    if (!negocio) {
      log('❌', 'Negocio no encontrado');
      return false;
    }

    // Verificar que existan credenciales
    const credential = await MercadoPagoCredential.findOne({
      where: { negocioId: negocio.id, activo: true }
    });

    if (!credential) {
      log('❌', 'No hay credenciales de MercadoPago configuradas');
      return false;
    }

    log('✅', 'Credenciales encontradas en BD');
    log('🔑', `Public Key: ${credential.publicKey}`);
    log('🏭', `Ambiente: ${credential.entornoProduccion ? 'PRODUCCIÓN' : 'TEST/SANDBOX'}`);
    log('👤', `User ID: ${credential.userId}`);

    return true;
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    return false;
  }
}

async function obtenerProductos() {
  log('📦', 'Paso 2: Obtener productos del menú...');

  try {
    productos = await Producto.findAll({
      where: { negocioId: negocio.id, activo: true },
      limit: 3
    });

    log('✅', `${productos.length} productos encontrados:`);
    productos.forEach(p => {
      log('  ', `- ${p.nombre}: $${p.precio}`);
    });

    return productos.length > 0;
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    return false;
  }
}

async function crearCliente() {
  log('👤', 'Paso 3: Crear cliente de prueba...');

  try {
    let cliente = await Cliente.findOne({ where: { email: 'cliente.prueba@test.com' } });

    if (!cliente) {
      cliente = await Cliente.create({
        nombre: 'Juan Pérez',
        telefono: '+5491155667788',
        email: 'cliente.prueba@test.com',
        negocioId: negocio.id,
        direcciones: [
          {
            calle: 'Av. Corrientes',
            numero: '1234',
            piso: '5',
            depto: 'B',
            barrio: 'Almagro',
            ciudad: 'CABA',
            codigoPostal: '1414',
            notas: 'Timbre 5B'
          }
        ]
      });
      log('✅', 'Cliente creado');
    } else {
      log('✅', 'Cliente existente encontrado');
    }

    log('📋', `Cliente: ${cliente.nombre} (${cliente.telefono})`);
    return cliente;
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    return null;
  }
}

async function crearPedido(cliente) {
  log('🛒', 'Paso 4: Crear pedido con productos...');

  try {
    // Seleccionar 2 productos
    const productosParaPedido = productos.slice(0, 2);

    const subtotal = productosParaPedido.reduce((sum, p) => sum + parseFloat(p.precioVenta), 0);
    const costoEnvio = 500;
    const total = subtotal + costoEnvio;

    // Crear pedido primero
    const pedido = await Pedido.create({
      negocioId: negocio.id,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      clienteTelefono: cliente.telefono,
      clienteDireccion: cliente.direcciones[0] ? `${cliente.direcciones[0].calle} ${cliente.direcciones[0].numero}` : '',
      total: total,
      subtotal: subtotal,
      costoEnvio: costoEnvio,
      modalidad: 'delivery',
      estado: 'nuevo',
      metodoPago: 'mercado_pago',
      cobrado: false
    });

    // Crear items del pedido
    const ItemPedido = require('../models/ItemPedido')(sequelize, require('sequelize').DataTypes);

    for (const producto of productosParaPedido) {
      const precio = parseFloat(producto.precioVenta);
      await ItemPedido.create({
        pedidoId: pedido.id,
        productoId: producto.id,
        nombre: producto.nombre,
        precioUnitario: precio,
        cantidad: 1,
        subtotal: precio * 1
      });
    }

    log('✅', `Pedido creado: #${pedido.id.substring(0, 8)}`);
    log('📦', `Items: ${productosParaPedido.length}`);
    log('💰', `Total: $${total} (Subtotal: $${subtotal} + Envío: $${costoEnvio})`);

    return pedido;
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    console.error(error);
    return null;
  }
}

async function iniciarPagoMercadoPago(pedido) {
  log('💳', 'Paso 5: Iniciar pago con MercadoPago...');

  try {
    // Este endpoint debería usar las credenciales OAuth automáticamente
    const response = await axios.post(
      `${API_URL}/pagos/iniciar-pago-mp`,
      { pedidoId: pedido.id },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    log('✅', 'Pago iniciado correctamente');
    log('🔗', `Preference ID: ${response.data.preferenceId}`);
    log('🌐', `Init Point: ${response.data.initPoint ? 'Generado ✓' : 'No disponible'}`);

    if (response.data.initPoint) {
      log('', '');
      log('👉', '═══════════════════════════════════════════════════');
      log('💰', 'URL DE PAGO GENERADA:');
      log('🔗', response.data.initPoint);
      log('👉', '═══════════════════════════════════════════════════');
      log('', '');
      log('📋', 'Para probar el pago:');
      log('1️⃣', 'Abrir la URL en el navegador');
      log('2️⃣', 'Usar tarjeta de prueba: 5031 7557 3453 0604');
      log('3️⃣', 'Vencimiento: 11/25, CVV: 123, Nombre: APRO');
      log('4️⃣', 'Completar el pago');
      log('5️⃣', 'MercadoPago enviará webhook a /api/pagos/webhooks/mercadopago');
      log('', '');
    }

    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    const errorDetail = error.response?.data?.error || '';

    log('❌', `Error iniciando pago: ${errorMsg}`);
    if (errorDetail) {
      log('📋', `Detalle: ${errorDetail}`);
    }

    // Mostrar más detalles del error
    if (error.response?.status === 401) {
      log('⚠️', 'Error de autenticación con MercadoPago');
      log('💡', 'Verifica que el Access Token sea válido');
    } else if (error.response?.status === 400) {
      log('⚠️', 'Error en los datos enviados a MercadoPago');
      log('💡', 'Verifica la estructura de la preferencia');
    }

    return null;
  }
}

async function simularWebhookMercadoPago(pedido, preferenceId) {
  log('🔔', 'Paso 6: Simular webhook de MercadoPago (pago aprobado)...');

  try {
    // Simular webhook de MercadoPago cuando el pago es aprobado
    const webhookPayload = {
      action: 'payment.created',
      api_version: 'v1',
      data: {
        id: '123456789' // ID del pago en MercadoPago
      },
      date_created: new Date().toISOString(),
      id: Math.random().toString(36).substring(7),
      live_mode: false,
      type: 'payment',
      user_id: '3362673939'
    };

    const response = await axios.post(
      `${API_URL}/pagos/webhooks/mercadopago`,
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature',
          'x-request-id': 'test-request-id'
        }
      }
    );

    log('✅', 'Webhook procesado');
    log('📋', `Respuesta: ${response.data.message || 'OK'}`);

    return true;
  } catch (error) {
    log('⚠️', `Error en webhook (puede ser normal): ${error.response?.data?.message || error.message}`);
    // No retornar false, el webhook puede fallar en testing
    return true;
  }
}

async function verificarPedidoActualizado(pedidoId) {
  log('🔍', 'Paso 7: Verificar estado del pedido en la base de datos...');

  try {
    const pedido = await Pedido.findByPk(pedidoId, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Negocio, as: 'negocio' }
      ]
    });

    if (!pedido) {
      log('❌', 'Pedido no encontrado');
      return false;
    }

    log('✅', 'Pedido encontrado');
    log('📊', '═════════════════════════════════════════');
    log('🆔', `ID: ${pedido.id.substring(0, 13)}...`);
    log('👤', `Cliente: ${pedido.cliente.nombre}`);
    log('🏪', `Negocio: ${pedido.negocio.nombre}`);
    log('💰', `Total: $${pedido.total}`);
    log('📦', `Estado: ${pedido.estado}`);
    log('💳', `Método de pago: ${pedido.metodoPago}`);
    log('💵', `Estado de pago: ${pedido.estadoPago}`);
    log('🕐', `Creado: ${pedido.createdAt.toLocaleString()}`);

    if (pedido.mpPreferenceId) {
      log('🔗', `MP Preference ID: ${pedido.mpPreferenceId}`);
    }
    if (pedido.mpPaymentId) {
      log('💳', `MP Payment ID: ${pedido.mpPaymentId}`);
    }

    log('📊', '═════════════════════════════════════════');

    const esCobrado = pedido.estadoPago === 'cobrado' || pedido.estadoPago === 'aprobado';
    if (esCobrado) {
      log('🎉', '¡PAGO CONFIRMADO! El pedido está cobrado.');
    } else {
      log('⏳', `Pago pendiente (${pedido.estadoPago})`);
    }

    return true;
  } catch (error) {
    log('❌', `Error: ${error.message}`);
    return false;
  }
}

async function runFlujoPago() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║     🧪 TEST FLUJO COMPLETO DE PAGO MP           ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  let pedido = null;
  let pagoData = null;

  // Paso 1: Configurar credenciales reales
  if (!(await setupCredencialesReales())) {
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Paso 2: Obtener productos
  if (!(await obtenerProductos())) {
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Paso 3: Crear cliente
  const cliente = await crearCliente();
  if (!cliente) {
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Paso 4: Crear pedido
  pedido = await crearPedido(cliente);
  if (!pedido) {
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Paso 5: Iniciar pago con MercadoPago
  pagoData = await iniciarPagoMercadoPago(pedido);

  console.log('\n' + '─'.repeat(50) + '\n');

  // Paso 6: Simular webhook (solo si el pago se inició correctamente)
  if (pagoData && pagoData.preferenceId) {
    await simularWebhookMercadoPago(pedido, pagoData.preferenceId);
    console.log('\n' + '─'.repeat(50) + '\n');
  }

  // Paso 7: Verificar pedido actualizado
  await verificarPedidoActualizado(pedido.id);

  console.log('\n' + '═'.repeat(50));

  if (pagoData && pagoData.initPoint) {
    console.log('\n✅ FLUJO COMPLETADO EXITOSAMENTE');
    console.log('\n📋 PRÓXIMO PASO MANUAL:');
    console.log('   Abre la URL de pago en el navegador y completa el pago');
    console.log('   con la tarjeta de prueba para ver el webhook en acción.');
    console.log('\n🔗 URL DE PAGO:');
    console.log(`   ${pagoData.initPoint}`);
  } else {
    console.log('\n⚠️ No se pudo generar la URL de pago');
    console.log('   Verifica las credenciales de MercadoPago');
  }

  console.log('\n' + '═'.repeat(50) + '\n');

  process.exit(0);
}

runFlujoPago().catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});
