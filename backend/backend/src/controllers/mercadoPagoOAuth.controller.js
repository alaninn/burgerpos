const mercadoPagoOAuthService = require('../services/mercadoPagoOAuthService');
const { MercadoPagoCredential } = require('../models');

/**
 * Iniciar flujo OAuth - Genera URL de autorización
 * GET /api/mercadopago/oauth/authorize
 */
exports.iniciarOAuth = async (req, res) => {
  try {
    const negocioId = req.usuario.negocioId;

    if (!negocioId) {
      return res.status(400).json({
        error: 'Usuario sin negocio asignado'
      });
    }

    const authUrl = await mercadoPagoOAuthService.getAuthorizationUrl(negocioId);

    res.json({ authUrl });
  } catch (error) {
    console.error('Error iniciando OAuth:', error);
    res.status(500).json({
      error: error.message || 'Error iniciando vinculación con MercadoPago'
    });
  }
};

/**
 * Callback OAuth - MercadoPago redirige aquí después de autorización
 * GET /api/mercadopago/oauth/callback?code=XXX&state=YYY
 */
exports.callbackOAuth = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      console.error('Callback OAuth sin code o state');
      return res.redirect(
        `${process.env.FRONTEND_URL}/oauth-callback.html?mp_error=missing_params`
      );
    }

    // Verificar state (protección CSRF)
    let stateData;
    try {
      stateData = mercadoPagoOAuthService.verifyState(state);
    } catch (error) {
      console.error('State inválido:', error.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/oauth-callback.html?mp_error=${encodeURIComponent('State inválido o expirado')}`
      );
    }

    // Intercambiar código por tokens
    let tokenData;
    try {
      tokenData = await mercadoPagoOAuthService.exchangeCodeForTokens(code);
    } catch (error) {
      console.error('Error intercambiando code:', error.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/oauth-callback.html?mp_error=${encodeURIComponent('Error obteniendo tokens')}`
      );
    }

    // Guardar credenciales cifradas
    try {
      await mercadoPagoOAuthService.saveCredentials(stateData.negocioId, tokenData);
    } catch (error) {
      console.error('Error guardando credenciales:', error.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/oauth-callback.html?mp_error=${encodeURIComponent('Error guardando credenciales')}`
      );
    }

    // Redirigir con éxito
    const frontendUrl = process.env.FRONTEND_URL.split(',')[0]; // Tomar la primera URL si hay múltiples
    res.redirect(`${frontendUrl}/oauth-callback.html?mp_success=true`);
  } catch (error) {
    console.error('Error en callback OAuth:', error);
    const frontendUrl = process.env.FRONTEND_URL.split(',')[0];
    res.redirect(
      `${frontendUrl}/oauth-callback.html?mp_error=${encodeURIComponent(error.message)}`
    );
  }
};

/**
 * Obtener estado de vinculación de MercadoPago
 * GET /api/mercadopago/oauth/status
 */
exports.getEstadoVinculacion = async (req, res) => {
  try {
    const negocioId = req.usuario.negocioId;

    if (!negocioId) {
      return res.status(400).json({
        error: 'Usuario sin negocio asignado'
      });
    }

    const credential = await MercadoPagoCredential.findOne({
      where: { negocioId, activo: true },
      attributes: ['id', 'publicKey', 'userId', 'entornoProduccion', 'expiresAt', 'createdAt']
    });

    res.json({
      vinculado: !!credential,
      credential: credential || null
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({
      error: error.message || 'Error obteniendo estado de vinculación'
    });
  }
};

/**
 * Desvincular cuenta de MercadoPago
 * POST /api/mercadopago/oauth/unlink
 */
exports.desvincularCuenta = async (req, res) => {
  try {
    const negocioId = req.usuario.negocioId;

    if (!negocioId) {
      return res.status(400).json({
        error: 'Usuario sin negocio asignado'
      });
    }

    await mercadoPagoOAuthService.unlinkAccount(negocioId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error desvinculando cuenta:', error);
    res.status(500).json({
      error: error.message || 'Error desvinculando cuenta de MercadoPago'
    });
  }
};
