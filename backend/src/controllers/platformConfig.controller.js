const { PlatformConfig } = require('../models');
const encryptionService = require('../services/encryptionService');

/**
 * Obtener configuración de MercadoPago
 * GET /api/platform-config/mercadopago
 */
exports.getMercadoPagoConfig = async (req, res) => {
  try {
    const clientId = await PlatformConfig.findOne({ where: { key: 'mp_client_id' } });
    const redirectUri = await PlatformConfig.findOne({ where: { key: 'mp_redirect_uri' } });

    res.json({
      clientId: clientId ? encryptionService.decrypt(clientId.value) : '',
      redirectUri: redirectUri ? encryptionService.decrypt(redirectUri.value) : '',
      configured: !!(clientId && redirectUri)
    });
  } catch (error) {
    console.error('Error obteniendo config MP:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Guardar configuración de MercadoPago
 * POST /api/platform-config/mercadopago
 */
exports.saveMercadoPagoConfig = async (req, res) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !redirectUri) {
      return res.status(400).json({ error: 'Client ID y Redirect URI son requeridos' });
    }

    // Guardar o actualizar Client ID
    await PlatformConfig.upsert({
      key: 'mp_client_id',
      value: encryptionService.encrypt(clientId),
      descripcion: 'MercadoPago OAuth Client ID'
    });

    // Guardar Client Secret solo si se provee (no es vacío)
    if (clientSecret && clientSecret.trim() !== '') {
      await PlatformConfig.upsert({
        key: 'mp_client_secret',
        value: encryptionService.encrypt(clientSecret),
        descripcion: 'MercadoPago OAuth Client Secret'
      });
    }

    // Guardar Redirect URI
    await PlatformConfig.upsert({
      key: 'mp_redirect_uri',
      value: encryptionService.encrypt(redirectUri),
      descripcion: 'MercadoPago OAuth Redirect URI'
    });

    console.log('✓ Configuración de plataforma MercadoPago guardada');
    res.json({ success: true });
  } catch (error) {
    console.error('Error guardando config MP:', error);
    res.status(500).json({ error: error.message });
  }
};
