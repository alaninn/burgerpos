const axios = require('axios');
const crypto = require('crypto');
const { MercadoPagoCredential, PlatformConfig } = require('../models');
const encryptionService = require('./encryptionService');

/**
 * Servicio OAuth para MercadoPago
 * Maneja vinculación automática de cuentas de MercadoPago sin exponer credenciales
 */
class MercadoPagoOAuthService {

  /**
   * Obtiene configuración OAuth de la plataforma (Client ID, Secret, Redirect URI)
   * @returns {Promise<Object>} { clientId, clientSecret, redirectUri }
   */
  async getPlatformConfig() {
    try {
      const clientId = await PlatformConfig.findOne({ where: { key: 'mp_client_id' } });
      const clientSecret = await PlatformConfig.findOne({ where: { key: 'mp_client_secret' } });
      const redirectUri = await PlatformConfig.findOne({ where: { key: 'mp_redirect_uri' } });

      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('MercadoPago no configurado a nivel de plataforma. El superadmin debe configurarlo primero.');
      }

      return {
        clientId: encryptionService.decrypt(clientId.value),
        clientSecret: encryptionService.decrypt(clientSecret.value),
        redirectUri: encryptionService.decrypt(redirectUri.value)
      };
    } catch (error) {
      console.error('Error obteniendo configuración de plataforma:', error.message);
      throw error;
    }
  }

  /**
   * Genera URL de autorización OAuth de MercadoPago
   * @param {string} negocioId - ID del negocio que está vinculando
   * @returns {Promise<string>} URL para abrir en popup
   */
  async getAuthorizationUrl(negocioId) {
    try {
      const { clientId, redirectUri } = await this.getPlatformConfig();
      const state = this.generateState(negocioId);

      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        platform_id: 'mp',
        redirect_uri: redirectUri,
        state: state
      });

      return `https://auth.mercadopago.com/authorization?${params.toString()}`;
    } catch (error) {
      console.error('Error generando URL de autorización:', error.message);
      throw error;
    }
  }

  /**
   * Genera state parameter con firma HMAC para prevenir CSRF
   * @param {string} negocioId - ID del negocio
   * @returns {string} State cifrado en base64
   */
  generateState(negocioId) {
    const payload = JSON.stringify({
      negocioId,
      timestamp: Date.now()
    });

    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET)
      .update(payload)
      .digest('hex');

    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  /**
   * Verifica y decodifica state parameter
   * @param {string} state - State recibido del callback
   * @returns {Object} { negocioId, timestamp }
   * @throws {Error} Si el state es inválido o expiró
   */
  verifyState(state) {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf8');
      const [payload, signature] = decoded.split(':');

      if (!payload || !signature) {
        throw new Error('State format inválido');
      }

      // Verificar firma HMAC
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('State signature inválida (posible ataque CSRF)');
      }

      const data = JSON.parse(payload);

      // Verificar que no sea muy antiguo (10 minutos máx)
      const age = Date.now() - data.timestamp;
      if (age > 10 * 60 * 1000) {
        throw new Error('State expirado. Iniciá la vinculación de nuevo.');
      }

      return data;
    } catch (error) {
      console.error('Error verificando state:', error.message);
      throw new Error('State parameter inválido');
    }
  }

  /**
   * Intercambia authorization code por access token y refresh token
   * @param {string} code - Authorization code de MercadoPago
   * @returns {Promise<Object>} Token data
   */
  async exchangeCodeForTokens(code) {
    try {
      const { clientId, clientSecret, redirectUri } = await this.getPlatformConfig();

      const response = await axios.post('https://api.mercadopago.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('✓ Tokens obtenidos exitosamente de MercadoPago');
      return response.data;
    } catch (error) {
      console.error('Error intercambiando código por tokens:', error.response?.data || error.message);
      throw new Error('Error obteniendo tokens de MercadoPago: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Guarda credenciales OAuth cifradas en la base de datos
   * @param {string} negocioId - ID del negocio
   * @param {Object} tokenData - Datos del token de MercadoPago
   */
  async saveCredentials(negocioId, tokenData) {
    try {
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Cifrar tokens antes de guardar
      const encryptedAccessToken = encryptionService.encrypt(tokenData.access_token);
      const encryptedRefreshToken = encryptionService.encrypt(tokenData.refresh_token);

      await MercadoPagoCredential.upsert({
        negocioId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        publicKey: tokenData.public_key,
        userId: tokenData.user_id,
        expiresAt,
        activo: true,
        entornoProduccion: tokenData.live_mode || false
      });

      console.log(`✓ Credenciales OAuth guardadas para negocio ${negocioId}`);
    } catch (error) {
      console.error('Error guardando credenciales:', error.message);
      throw new Error('Error guardando credenciales de MercadoPago');
    }
  }

  /**
   * Obtiene access token válido (con refresh automático si expiró)
   * FUNCIÓN CRÍTICA: Usada en cada pago
   * @param {string} negocioId - ID del negocio
   * @returns {Promise<string>} Access token válido
   */
  async getValidAccessToken(negocioId) {
    try {
      const credential = await MercadoPagoCredential.findOne({
        where: { negocioId, activo: true }
      });

      if (!credential) {
        throw new Error('MercadoPago no vinculado. El negocio debe vincular su cuenta primero.');
      }

      // Si el token aún es válido (con margen de 5 minutos)
      const now = new Date();
      const expiresWithMargin = new Date(credential.expiresAt.getTime() - 5 * 60 * 1000);

      if (now < expiresWithMargin) {
        // Token válido, descifrarlo y retornarlo
        return encryptionService.decrypt(credential.accessToken);
      }

      // Token expiró o está por expirar, refrescar
      console.log(`🔄 Token expirado para negocio ${negocioId}, refrescando...`);
      const newTokenData = await this.refreshAccessToken(credential);
      await this.saveCredentials(negocioId, newTokenData);

      return newTokenData.access_token;
    } catch (error) {
      console.error('Error obteniendo access token:', error.message);
      throw error;
    }
  }

  /**
   * Refresca access token usando refresh token
   * @param {Object} credential - Credencial de la BD
   * @returns {Promise<Object>} Nuevos tokens
   */
  async refreshAccessToken(credential) {
    try {
      const { clientId, clientSecret } = await this.getPlatformConfig();
      const refreshToken = encryptionService.decrypt(credential.refreshToken);

      const response = await axios.post('https://api.mercadopago.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('✓ Token refrescado exitosamente');
      return response.data;
    } catch (error) {
      console.error('Error refrescando token:', error.response?.data || error.message);
      throw new Error('Error refrescando access token de MercadoPago');
    }
  }

  /**
   * Desvincula cuenta de MercadoPago
   * @param {string} negocioId - ID del negocio
   */
  async unlinkAccount(negocioId) {
    try {
      await MercadoPagoCredential.update(
        { activo: false },
        { where: { negocioId } }
      );

      console.log(`✓ Cuenta de MercadoPago desvinculada para negocio ${negocioId}`);
    } catch (error) {
      console.error('Error desvinculando cuenta:', error.message);
      throw new Error('Error desvinculando cuenta de MercadoPago');
    }
  }
}

module.exports = new MercadoPagoOAuthService();
