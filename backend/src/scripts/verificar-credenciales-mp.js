const axios = require('axios');
const { MercadoPagoCredential, Negocio } = require('../models');
const encryptionService = require('../services/encryptionService');

async function verificarCredenciales() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   🔍 VERIFICAR CREDENCIALES MERCADOPAGO          ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  try {
    // Obtener negocio
    const negocio = await Negocio.findOne({ where: { slug: 'burger-demo' } });
    if (!negocio) {
      console.log('❌ Negocio no encontrado');
      process.exit(1);
    }

    // Obtener credenciales de BD
    const credential = await MercadoPagoCredential.findOne({
      where: { negocioId: negocio.id }
    });

    if (!credential) {
      console.log('❌ No hay credenciales guardadas en BD');
      console.log('\n📋 NECESITO:');
      console.log('   1. Access Token (APP_USR-...)');
      console.log('   2. Public Key (APP_USR-...)');
      process.exit(1);
    }

    console.log('✅ Credenciales encontradas en BD\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Descifrar access token
    const accessToken = encryptionService.decrypt(credential.accessToken);
    const publicKey = credential.publicKey;

    console.log('🔑 Public Key:');
    console.log(`   ${publicKey}\n`);

    console.log('🔑 Access Token (primeros 50 caracteres):');
    console.log(`   ${accessToken.substring(0, 50)}...\n`);

    console.log('📅 Expira:');
    console.log(`   ${credential.expiresAt}\n`);

    console.log('🏭 Ambiente:');
    console.log(`   ${credential.entornoProduccion ? 'PRODUCCIÓN' : 'TEST/SANDBOX'}\n`);

    console.log('═══════════════════════════════════════════════════\n');

    // TEST 1: Verificar si el token es válido consultando la API de MP
    console.log('🧪 TEST 1: Verificando Access Token con MercadoPago API...\n');

    try {
      const response = await axios.get('https://api.mercadopago.com/v1/payment_methods', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      });

      console.log('✅ Access Token es VÁLIDO');
      console.log(`   API respondió con ${response.data.length} métodos de pago\n`);
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      console.log('❌ Access Token es INVÁLIDO');
      console.log(`   Status: ${status}`);
      console.log(`   Error: ${message}\n`);

      if (status === 401) {
        console.log('⚠️  PROBLEMA: Token inválido o expirado\n');
        console.log('═══════════════════════════════════════════════════\n');
        console.log('📋 NECESITO UN NUEVO ACCESS TOKEN\n');
        console.log('Dónde obtenerlo:');
        console.log('1. Ir a: https://www.mercadopago.com.ar/developers/panel/app');
        console.log('2. Seleccionar tu aplicación');
        console.log('3. En "Credenciales", copiar:');
        console.log('   - Access Token (de PRODUCCIÓN o TEST según lo que uses)');
        console.log('   - Public Key\n');
        console.log('Formato esperado:');
        console.log('   Access Token: APP_USR-XXXXXXXX-XXXXXX-XXXXXXXX...');
        console.log('   Public Key:   APP_USR-XXXXXXXX-XXXX-XXXX-XXXX-...\n');
        console.log('═══════════════════════════════════════════════════\n');
      }

      process.exit(1);
    }

    // TEST 2: Intentar crear una preferencia de prueba
    console.log('🧪 TEST 2: Intentando crear preferencia de pago...\n');

    try {
      const preference = {
        items: [
          {
            title: 'Test - Hamburguesa',
            quantity: 1,
            unit_price: 100,
            currency_id: 'ARS'
          }
        ],
        back_urls: {
          success: 'http://localhost:3000/pago-exitoso',
          failure: 'http://localhost:3000/pago-fallido',
          pending: 'http://localhost:3000/pago-pendiente'
        },
        auto_return: 'approved',
        external_reference: 'test-' + Date.now()
      };

      const response = await axios.post(
        'https://api.mercadopago.com/checkout/preferences',
        preference,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('✅ Preferencia creada exitosamente');
      console.log(`   Preference ID: ${response.data.id}`);
      console.log(`   Init Point: ${response.data.init_point}\n`);

      console.log('═══════════════════════════════════════════════════\n');
      console.log('🎉 TODAS LAS CREDENCIALES SON VÁLIDAS\n');
      console.log('El sistema está listo para recibir pagos.');
      console.log('═══════════════════════════════════════════════════\n');

      process.exit(0);

    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      const cause = error.response?.data?.cause || [];

      console.log('❌ No se pudo crear preferencia');
      console.log(`   Status: ${status}`);
      console.log(`   Error: ${message}`);

      if (cause.length > 0) {
        console.log(`   Causa: ${JSON.stringify(cause, null, 2)}`);
      }
      console.log('');

      if (status === 401 || status === 403) {
        console.log('⚠️  PROBLEMA: Token sin permisos o inválido\n');
        console.log('═══════════════════════════════════════════════════\n');
        console.log('📋 NECESITO:');
        console.log('   Un Access Token con permisos de:');
        console.log('   - read (lectura)');
        console.log('   - write (escritura)');
        console.log('   - offline_access (para refresh token)\n');
        console.log('Verificar en:');
        console.log('   https://www.mercadopago.com.ar/developers/panel/app');
        console.log('   → Tu aplicación → Scopes/Permisos\n');
        console.log('═══════════════════════════════════════════════════\n');
      }

      process.exit(1);
    }

  } catch (error) {
    console.log('💥 Error:', error.message);
    process.exit(1);
  }
}

verificarCredenciales();
