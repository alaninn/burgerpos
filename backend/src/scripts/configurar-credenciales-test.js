const { sequelize } = require('../models');
const MercadoPagoCredential = require('../models/MercadoPagoCredential')(sequelize, require('sequelize').DataTypes);
const Negocio = require('../models/Negocio')(sequelize, require('sequelize').DataTypes);
const encryptionService = require('../services/encryptionService');

async function configurarCredencialesTest() {
  console.log('\n🔧 Configurando credenciales de PRUEBA de MercadoPago...\n');

  try {
    // Obtener negocio
    const negocio = await Negocio.findOne({ where: { slug: 'burger-demo' } });
    if (!negocio) {
      console.log('❌ Negocio no encontrado');
      process.exit(1);
    }

    // Credenciales de PRUEBA (TEST/SANDBOX)
    const testCredentials = {
      negocioId: negocio.id,
      accessToken: encryptionService.encrypt('APP_USR-260321286540560-042818-a090088f49c26b5fe6a5e5d8f4ce66f9-3362673939'),
      refreshToken: encryptionService.encrypt('TEST-REFRESH-TOKEN'), // MP no siempre da refresh token
      publicKey: 'APP_USR-c6f626f8-0e90-4b2e-a030-c32b27a5fa30',
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 días
      userId: '3362673939',
      activo: true,
      entornoProduccion: false // FALSE = TEST/SANDBOX
    };

    // Eliminar credenciales anteriores
    await MercadoPagoCredential.destroy({ where: { negocioId: negocio.id } });

    // Crear nuevas credenciales
    await MercadoPagoCredential.create(testCredentials);

    console.log('✅ Credenciales de PRUEBA configuradas\n');
    console.log('═════════════════════════════════════════');
    console.log('🔑 Public Key:');
    console.log(`   ${testCredentials.publicKey}\n`);
    console.log('🔑 Access Token:');
    console.log(`   APP_USR-260321286540560-...\n`);
    console.log('👤 User ID:');
    console.log(`   ${testCredentials.userId}\n`);
    console.log('🏭 Ambiente:');
    console.log(`   TEST/SANDBOX (pruebas)\n`);
    console.log('📅 Expira:');
    console.log(`   ${testCredentials.expiresAt.toLocaleDateString()}\n`);
    console.log('═════════════════════════════════════════\n');

    console.log('✅ Listo para probar pagos con tarjetas de prueba');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

configurarCredencialesTest();
