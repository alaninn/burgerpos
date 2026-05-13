const { sequelize } = require('../models');
const PlatformConfig = require('../models/PlatformConfig')(sequelize, require('sequelize').DataTypes);
const encryptionService = require('../services/encryptionService');

async function corregirClientId() {
  try {
    console.log('🔧 Corrigiendo Client ID...\n');

    const clientIdCorrecto = '4859738576577948';
    const encryptedClientId = encryptionService.encrypt(clientIdCorrecto);

    await PlatformConfig.update(
      { value: encryptedClientId },
      { where: { key: 'mp_client_id' } }
    );

    console.log('✅ Client ID corregido a:', clientIdCorrecto);

    // Verificar
    const config = await PlatformConfig.findOne({ where: { key: 'mp_client_id' } });
    const decrypted = encryptionService.decrypt(config.value);
    console.log('✅ Verificado:', decrypted);

    console.log('\n✅ Client ID actualizado correctamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

corregirClientId();
