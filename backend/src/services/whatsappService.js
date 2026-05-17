const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { WhatsAppConfig } = require('../models');

class WhatsAppMultiTenantService {
  constructor() {
    this.instances = new Map(); // negocioId → { sock, qr, status, lastActivity }
    this.MAX_INSTANCES = 8; // Límite por RAM (1GB server)
    this.IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutos
    this.idleTimers = new Map(); // negocioId → timeout

    console.log('✅ WhatsApp Multi-Tenant Service inicializado (Baileys)');
  }

  /**
   * Obtiene o crea una instancia de WhatsApp para un negocio específico
   */
  async getInstance(negocioId) {
    // Si ya existe y está activa, resetear idle timer y retornar
    if (this.instances.has(negocioId)) {
      this.resetIdleTimer(negocioId);
      return this.instances.get(negocioId);
    }

    // Si llegamos al límite de instancias, eliminar la menos usada
    if (this.instances.size >= this.MAX_INSTANCES) {
      await this.evictLeastRecentlyUsed();
    }

    // Crear nueva instancia
    console.log(`🔄 Lazy-loading WhatsApp instance for negocio: ${negocioId}`);
    return await this.initInstance(negocioId);
  }

  /**
   * Inicializa una nueva instancia de Baileys para un negocio
   */
  async initInstance(negocioId) {
    try {
      const authPath = path.join(__dirname, `../../whatsapp-sessions/${negocioId}`);

      // Crear directorio si no existe
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
      }

      // Cargar estado de autenticación
      const { state, saveCreds } = await useMultiFileAuthState(authPath);

      // Obtener última versión de WhatsApp Web
      const { version } = await fetchLatestBaileysVersion();

      // Crear socket
      const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }), // Sin logs de Baileys
        printQRInTerminal: false,
        browser: ['BurgerPOS', 'Chrome', '120.0.0'],
        defaultQueryTimeoutMs: undefined
      });

      // Estado de la instancia
      const instance = {
        sock,
        qr: null,
        status: 'connecting',
        lastActivity: Date.now()
      };

      this.instances.set(negocioId, instance);

      // ── Eventos ──────────────────────────────────────────

      // Guardar credenciales cuando cambien
      sock.ev.on('creds.update', saveCreds);

      // Manejar cambios de conexión
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // QR Code generado
        if (qr) {
          console.log(`📱 QR generado para negocio: ${negocioId}`);
          instance.qr = qr;
          instance.status = 'connecting';

          // Guardar QR en base de datos
          await this.saveQrToDatabase(negocioId, qr);
        }

        // Conexión cerrada
        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(`❌ WhatsApp desconectado (negocio: ${negocioId}), reconnect:`, shouldReconnect);

          if (shouldReconnect) {
            // Reconectar automáticamente
            setTimeout(() => {
              this.instances.delete(negocioId);
              this.initInstance(negocioId);
            }, 3000);
          } else {
            // Logout manual - limpiar sesión
            this.instances.delete(negocioId);
            await this.updateStatus(negocioId, 'disconnected', null);
          }
        }

        // Conexión abierta (exitosa)
        if (connection === 'open') {
          console.log(`✅ WhatsApp conectado para negocio: ${negocioId}`);
          instance.status = 'connected';
          instance.qr = null;
          instance.lastActivity = Date.now();

          await this.updateStatus(negocioId, 'connected', null);
          this.scheduleIdleShutdown(negocioId);
        }
      });

      // Resetear idle timer en cada actividad
      sock.ev.on('messages.upsert', () => {
        this.resetIdleTimer(negocioId);
      });

      return instance;

    } catch (error) {
      console.error(`❌ Error inicializando WhatsApp para negocio ${negocioId}:`, error.message);
      await this.updateStatus(negocioId, 'error', null);
      throw error;
    }
  }

  /**
   * Obtiene el estado de conexión de un negocio
   */
  async getStatus(negocioId) {
    const instance = this.instances.get(negocioId);

    if (instance) {
      return {
        status: instance.status,
        ready: instance.status === 'connected',
        hasQr: !!instance.qr
      };
    }

    // No hay instancia en memoria, consultar base de datos
    const config = await WhatsAppConfig.findOne({ where: { negocioId } });

    return {
      status: config?.status || 'disconnected',
      ready: false,
      hasQr: false
    };
  }

  /**
   * Obtiene el código QR para vincular WhatsApp
   */
  async getQrCode(negocioId) {
    let instance = this.instances.get(negocioId);

    // Si no existe instancia, crearla
    if (!instance) {
      instance = await this.getInstance(negocioId);
    }

    // Esperar hasta 15 segundos a que se genere el QR
    for (let i = 0; i < 30; i++) {
      if (instance.qr) {
        try {
          const qrDataURL = await qrcode.toDataURL(instance.qr);
          return qrDataURL;
        } catch (error) {
          console.error('Error generando QR data URL:', error.message);
          return null;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`⏱️ Timeout esperando QR para negocio: ${negocioId}`);
    return null;
  }

  /**
   * Desconecta WhatsApp de un negocio específico
   */
  async disconnect(negocioId) {
    try {
      const instance = this.instances.get(negocioId);

      if (instance && instance.sock) {
        await instance.sock.logout();
      }

      // Limpiar instancia
      this.instances.delete(negocioId);
      this.clearIdleTimer(negocioId);

      // Limpiar sesión del filesystem
      const authPath = path.join(__dirname, `../../whatsapp-sessions/${negocioId}`);
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }

      // Actualizar base de datos
      await this.updateStatus(negocioId, 'disconnected', null);

      console.log(`🔌 WhatsApp desconectado para negocio: ${negocioId}`);
      return true;

    } catch (error) {
      console.error(`Error desconectando WhatsApp (negocio ${negocioId}):`, error.message);
      return false;
    }
  }

  /**
   * Envía un mensaje de WhatsApp
   */
  async sendMessage(negocioId, number, message) {
    console.log(`\n📤 ========== INTENTO DE ENVÍO WHATSAPP ==========`);
    console.log(`🏢 Negocio: ${negocioId}`);
    console.log(`📱 Número: ${number}`);
    console.log(`💬 Mensaje: ${message.substring(0, 50)}...`);

    try {
      // Obtener instancia
      const instance = await this.getInstance(negocioId);

      if (instance.status !== 'connected') {
        console.log(`❌ WhatsApp no está conectado (status: ${instance.status})`);
        return false;
      }

      // Formatear número para Argentina
      let num = number.replace(/\D/g, '');

      if (num.length === 10 && num.startsWith('11')) {
        num = '549' + num;
      } else if (num.length === 8) {
        num = '54911' + num;
      } else if (num.length === 10 && !num.startsWith('549')) {
        num = '54' + num;
      }

      console.log(`🔢 Número formateado: ${num}`);

      const jid = num + '@s.whatsapp.net';

      // Verificar si el número está registrado
      let isRegistered = false;
      try {
        const [result] = await instance.sock.onWhatsApp(jid);
        isRegistered = result?.exists || false;
        console.log(`${isRegistered ? '✅' : '❌'} Número ${isRegistered ? 'SÍ' : 'NO'} está en WhatsApp`);
      } catch (checkError) {
        console.log(`⚠️ No se pudo verificar registro: ${checkError.message}`);
        isRegistered = true; // Intentar enviar de todos modos
      }

      if (!isRegistered) {
        console.log('❌ El número no tiene WhatsApp');
        return false;
      }

      // Enviar mensaje
      console.log('📨 Enviando mensaje...');
      await instance.sock.sendMessage(jid, { text: message });

      console.log(`✅ ✅ ✅ MENSAJE ENVIADO EXITOSAMENTE ✅ ✅ ✅`);
      console.log(`================================================\n`);

      // Actualizar última actividad
      instance.lastActivity = Date.now();
      this.resetIdleTimer(negocioId);

      return true;

    } catch (error) {
      console.error(`❌ Error enviando mensaje (negocio ${negocioId}):`, error.message);
      console.log(`================================================\n`);
      return false;
    }
  }

  /**
   * Renderiza un template de mensaje con variables
   */
  renderTemplate(templateKey, variables, config) {
    const templates = config?.templates || this.getDefaultTemplates();
    let template = templates[templateKey] || '';

    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return template;
  }

  /**
   * Guarda templates personalizados para un negocio
   */
  async saveTemplates(negocioId, templates) {
    try {
      let config = await WhatsAppConfig.findOne({ where: { negocioId } });

      if (!config) {
        config = await WhatsAppConfig.create({
          negocioId,
          config: { templates }
        });
      } else {
        await config.update({
          config: { ...config.config, templates }
        });
      }

      console.log(`💾 Templates guardados para negocio: ${negocioId}`);
      return true;
    } catch (error) {
      console.error(`Error guardando templates (negocio ${negocioId}):`, error.message);
      return false;
    }
  }

  // ── Métodos privados ──────────────────────────────────────

  /**
   * Programa auto-shutdown de una instancia después de inactividad
   */
  scheduleIdleShutdown(negocioId) {
    this.clearIdleTimer(negocioId);

    const timer = setTimeout(async () => {
      const instance = this.instances.get(negocioId);

      if (instance && Date.now() - instance.lastActivity >= this.IDLE_TIMEOUT) {
        console.log(`⏱️ Auto-shutdown idle WhatsApp instance: ${negocioId}`);

        // No hacer logout, solo limpiar de memoria
        this.instances.delete(negocioId);
        this.clearIdleTimer(negocioId);
      }
    }, this.IDLE_TIMEOUT);

    this.idleTimers.set(negocioId, timer);
  }

  /**
   * Resetea el timer de idle cuando hay actividad
   */
  resetIdleTimer(negocioId) {
    const instance = this.instances.get(negocioId);
    if (instance) {
      instance.lastActivity = Date.now();
      this.scheduleIdleShutdown(negocioId);
    }
  }

  /**
   * Limpia el timer de idle
   */
  clearIdleTimer(negocioId) {
    const timer = this.idleTimers.get(negocioId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(negocioId);
    }
  }

  /**
   * Elimina la instancia menos usada (LRU eviction)
   */
  async evictLeastRecentlyUsed() {
    let oldestNegocioId = null;
    let oldestActivity = Infinity;

    for (const [negocioId, instance] of this.instances.entries()) {
      if (instance.lastActivity < oldestActivity) {
        oldestActivity = instance.lastActivity;
        oldestNegocioId = negocioId;
      }
    }

    if (oldestNegocioId) {
      console.log(`🗑️ LRU eviction - liberando instancia: ${oldestNegocioId}`);
      this.instances.delete(oldestNegocioId);
      this.clearIdleTimer(oldestNegocioId);
    }
  }

  /**
   * Guarda el QR en la base de datos
   */
  async saveQrToDatabase(negocioId, qr) {
    try {
      let config = await WhatsAppConfig.findOne({ where: { negocioId } });

      if (!config) {
        await WhatsAppConfig.create({
          negocioId,
          qrCode: qr,
          status: 'connecting'
        });
      } else {
        await config.update({
          qrCode: qr,
          status: 'connecting'
        });
      }
    } catch (error) {
      console.error(`Error guardando QR en DB (negocio ${negocioId}):`, error.message);
    }
  }

  /**
   * Actualiza el estado en la base de datos
   */
  async updateStatus(negocioId, status, qrCode) {
    try {
      let config = await WhatsAppConfig.findOne({ where: { negocioId } });

      if (!config) {
        await WhatsAppConfig.create({
          negocioId,
          status,
          qrCode,
          lastActivity: new Date()
        });
      } else {
        await config.update({
          status,
          qrCode,
          lastActivity: new Date()
        });
      }
    } catch (error) {
      console.error(`Error actualizando status en DB (negocio ${negocioId}):`, error.message);
    }
  }

  /**
   * Retorna templates por defecto
   */
  getDefaultTemplates() {
    return {
      delivery: {
        nuevo_a_preparacion: '¡Hola! Tu pedido fue realizado y se encuentra en preparación.\nTe avisaremos por este medio cuando esté en camino!\nLas promociones y descuentos son validas solo en Efectivo.',
        preparacion_a_listo: 'Tu pedido ya está listo para ser entregado.\nen minutos sale hacia tu domicilio por favor estar atentos.',
        listo_a_en_camino: 'Tu pedido va en camino! Por favor este atento que el repartidor esta llegando.',
        cualquier_a_cancelado: 'Tu pedido ha sido cancelado.'
      },
      takeaway: {
        nuevo_a_preparacion: '¡Hola! Tu pedido fue realizado y se encuentra en preparación.\nTe avisaremos por este medio cuando esté Listo!\nLas promociones y descuentos son validas solo en Efectivo.',
        preparacion_a_listo: 'Tu pedido ya está listo para retirar. Podes venir cuando quieras!',
        cualquier_a_cancelado: 'Tu pedido ha sido cancelado.'
      }
    };
  }
}

// Exportar singleton
module.exports = new WhatsAppMultiTenantService();
