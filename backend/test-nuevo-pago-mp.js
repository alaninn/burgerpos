const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function crearPedidoDePrueba() {
  try {
    console.log('🔵 Iniciando prueba de pago MercadoPago...\n');

    // 1. Iniciar pago para un pedido existente o crear uno nuevo
    console.log('📝 Creando preferencia de pago...');

    // Primero obtener un pedido cancelado para reutilizar
    const response = await axios.post(`${API_URL}/pagos/iniciar-pago-mp`, {
      pedidoId: 'b68ba544-2144-4739-a336-d6402e48d896'
    });

    const { preferenceId, initPoint } = response.data;

    console.log('\n✅ PREFERENCIA CREADA:');
    console.log('Preference ID:', preferenceId);
    console.log('Init Point:', initPoint);
    console.log('\n🌐 Abre este URL en el navegador para completar el pago:');
    console.log(initPoint);
    console.log('\n📋 Datos de tarjeta de prueba (APROBADO):');
    console.log('Número: 5031 7557 3453 0604');
    console.log('Nombre: APRO');
    console.log('Vencimiento: 11/27');
    console.log('CVV: 123');
    console.log('DNI: 12345678');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

crearPedidoDePrueba();
