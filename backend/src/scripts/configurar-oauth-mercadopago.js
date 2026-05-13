const { sequelize } = require('../models');
const PlatformConfig = require('../models/PlatformConfig')(sequelize, require('sequelize').DataTypes);
const encryptionService = require('../services/encryptionService');

async function configurarOAuthMercadoPago() {
  try {
    console.log('🔧 Configurando OAuth de MercadoPago...\n');

    // Credenciales OAuth de producción
    const clientId = '2603212865405605';
    const clientSecret = 'gV2gsblad1XvNyeMSC2t1kzVqaFQeQPY';
    const redirectUri = 'http://gestionq24.ddns.net:3001/api/mercadopago/oauth/callback';

    // Cifrar valores sensibles
    const encryptedClientId = encryptionService.encrypt(clientId);
    const encryptedClientSecret = encryptionService.encrypt(clientSecret);
    const encryptedRedirectUri = encryptionService.encrypt(redirectUri);

    // Insertar o actualizar Client ID
    await PlatformConfig.upsert({
      key: 'mp_client_id',
      value: encryptedClientId,
      descripcion: 'Client ID de la aplicación OAuth de MercadoPago'
    });
    console.log('✅ Client ID configurado');

    // Insertar o actualizar Client Secret
    await PlatformConfig.upsert({
      key: 'mp_client_secret',
      value: encryptedClientSecret,
      descripcion: 'Client Secret de la aplicación OAuth de MercadoPago'
    });
    console.log('✅ Client Secret configurado');

    // Insertar o actualizar Redirect URI
    await PlatformConfig.upsert({
      key: 'mp_redirect_uri',
      value: encryptedRedirectUri,
      descripcion: 'Redirect URI para el flujo OAuth de MercadoPago'
    });
    console.log('✅ Redirect URI configurada');

    // Verificar que se guardaron correctamente
    console.log('\n🔍 Verificando configuración...\n');

    const configs = await PlatformConfig.findAll({
      where: {
        key: ['mp_client_id', 'mp_client_secret', 'mp_redirect_uri']
      }
    });

    configs.forEach(config => {
      const decrypted = encryptionService.decrypt(config.value);
      console.log(`${config.key}:`);

      if (config.key === 'mp_client_secret') {
        // Ocultar parcialmente el secret
        console.log(`  ${decrypted.substring(0, 8)}${'*'.repeat(20)}`);
      } else {
        console.log(`  ${decrypted}`);
      }
    });

    console.log('\n✅ Configuración OAuth de MercadoPago completada exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Verificar en MercadoPago que la Redirect URI esté autorizada:');
    console.log('   http://gestionq24.ddns.net:3001/api/mercadopago/oauth/callback');
    console.log('2. Configurar port forwarding en router (puertos 3000 y 3001)');
    console.log('3. Abrir puertos en firewall de Windows (ver CONFIGURACION_NOIP.md)');
    console.log('4. Probar vinculación: Login → Configuraciones → MercadoPago → Vincular cuenta');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error configurando OAuth:', error);
    process.exit(1);
  }
}

configurarOAuthMercadoPago();
