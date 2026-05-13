const crypto = require('crypto');

/**
 * Servicio de cifrado usando AES-256-GCM
 * Cifra tokens sensibles antes de guardarlos en la base de datos
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';

    // Obtener clave de cifrado desde variable de entorno
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
      console.warn('⚠ ENCRYPTION_KEY no configurada. Generando clave temporal...');
      console.warn('⚠ ADVERTENCIA: Esto NO es seguro para producción');
      this.secret = crypto.randomBytes(32);
    } else {
      // Convertir hex string a buffer
      this.secret = Buffer.from(key, 'hex');

      if (this.secret.length !== 32) {
        throw new Error('ENCRYPTION_KEY debe ser de 32 bytes (64 caracteres hex)');
      }
    }
  }

  /**
   * Cifra un texto usando AES-256-GCM
   * @param {string} text - Texto plano a cifrar
   * @returns {string} Formato: iv:authTag:encrypted (todo en hex)
   */
  encrypt(text) {
    if (!text) return '';

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.secret, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Formato: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Error cifrando:', error.message);
      throw new Error('Error al cifrar datos');
    }
  }

  /**
   * Descifra un texto cifrado con AES-256-GCM
   * @param {string} encryptedData - Formato: iv:authTag:encrypted
   * @returns {string} Texto plano
   */
  decrypt(encryptedData) {
    if (!encryptedData) return '';

    try {
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        throw new Error('Formato de datos cifrados inválido');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.secret, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Error descifrando:', error.message);
      throw new Error('Error al descifrar datos');
    }
  }

  /**
   * Genera una clave de cifrado aleatoria
   * @returns {string} Clave en formato hex (64 caracteres)
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new EncryptionService();
