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
    this.sendQueues = new Map(); // negocioId → Promise (cola FIFO de envios)
    this.reconnectAttempts = new Map(); // negocioId → contador de reintentos

    console.log('✅ WhatsApp Multi-Tenant Service inicializado (Baileys)');
  }

  /**
   * Borra los archivos de sesion de un negocio (credenciales corruptas o
   * deslogueadas). Sin esto, una sesion invalidada bloquea la generacion de
   * un QR nuevo para siempre.
   */
  limpiarSesionArchivos(negocioId) {
    try {
      const authPath = path.join(__dirname, `../../whatsapp-sessions/${negocioId}`);
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log(`🧹 Sesión de WhatsApp limpiada para negocio: ${negocioId}`);
      }
    } catch (err) {
      console.error(`Error limpiando sesión (negocio ${negocioId}):`, err.message);
    }
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
        browser: ['BurgerPOS', 'Chrome', '120.0.0'],
        // Un timeout finito evita que las queries queden colgadas para siempre
        // (era 'undefined', lo que podia tildar el envio cuando la red fallaba)
        defaultQueryTimeoutMs: 60_000,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 25_000,
        markOnlineOnConnect: false
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
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          this.instances.delete(negocioId);

          // loggedOut (401) o connectionReplaced (440): la sesión ya no sirve.
          // Hay que BORRAR las credenciales para poder generar un QR nuevo; si
          // no, la sesión muerta bloquea la vinculación indefinidamente.
          if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.connectionReplaced) {
            console.log(`❌ WhatsApp cerrado (negocio: ${negocioId}) motivo: ${statusCode} — limpiando sesión`);
            this.limpiarSesionArchivos(negocioId);
            this.reconnectAttempts.delete(negocioId);
            await this.updateStatus(negocioId, 'disconnected', null);
            return;
          }

          // Resto de motivos (incluye restartRequired 515, parte normal del
          // flujo de QR): reconectar con backoff y tope de intentos.
          const intentos = (this.reconnectAttempts.get(negocioId) || 0) + 1;
          this.reconnectAttempts.set(negocioId, intentos);
          if (intentos > 5) {
            console.log(`⛔ Demasiados reintentos de WhatsApp (negocio: ${negocioId}) — se detiene`);
            this.reconnectAttempts.delete(negocioId);
            await this.updateStatus(negocioId, 'disconnected', null);
            return;
          }
          const espera = Math.min(3000 * intentos, 15000);
          console.log(`❌ WhatsApp desconectado (negocio: ${negocioId}) motivo: ${statusCode} — reintento ${intentos} en ${espera}ms`);
          setTimeout(() => { this.initInstance(negocioId).catch(() => {}); }, espera);
        }

        // Conexión abierta (exitosa)
        if (connection === 'open') {
          console.log(`✅ WhatsApp conectado para negocio: ${negocioId}`);
          instance.status = 'connected';
          instance.qr = null;
          instance.lastActivity = Date.now();
          this.reconnectAttempts.delete(negocioId);

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
    // Si ya está conectado, no hay QR que generar
    const actual = this.instances.get(negocioId);
    if (actual?.status === 'connected') return null;

    // Hasta 2 vueltas: si la sesión estaba muerta (loggedOut), la primera vuelta
    // la limpia y la segunda arranca fresca y genera el QR.
    for (let intento = 0; intento < 2; intento++) {
      let instance = this.instances.get(negocioId);
      if (!instance) {
        try { instance = await this.getInstance(negocioId); }
        catch { instance = null; }
      }

      // Esperar hasta 20 segundos a que aparezca el QR
      for (let i = 0; i < 40; i++) {
        // La instancia murió (sesión inválida): salir para reintentar limpio
        if (!this.instances.has(negocioId) && !instance?.qr) break;

        if (instance?.qr) {
          try {
            return await qrcode.toDataURL(instance.qr);
          } catch (error) {
            console.error('Error generando QR data URL:', error.message);
            return null;
          }
        }
        if (instance?.status === 'connected') return null;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // No hubo QR: limpiar sesión por las dudas y reintentar una vez
      if (intento === 0) {
        this.instances.delete(negocioId);
        this.limpiarSesionArchivos(negocioId);
      }
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
  /**
   * Envía un mensaje. Los envíos de un mismo negocio se encolan y se procesan
   * de a uno (FIFO): si se confirman 10 pedidos casi simultáneos, cada mensaje
   * sale en orden sin saturar el socket ni pisarse entre sí.
   */
  async sendMessage(negocioId, number, message) {
    const previa = this.sendQueues.get(negocioId) || Promise.resolve();
    const tarea = previa
      .catch(() => {}) // un envío fallido no bloquea los siguientes
      .then(() => this._enviarAhora(negocioId, number, message));
    this.sendQueues.set(negocioId, tarea);
    // Liberar la referencia de la cola cuando esta tarea sea la última
    tarea.finally(() => {
      if (this.sendQueues.get(negocioId) === tarea) this.sendQueues.delete(negocioId);
    });
    return tarea;
  }

  async _enviarAhora(negocioId, number, message) {
    try {
      const instance = await this.getInstance(negocioId);

      if (instance.status !== 'connected') {
        console.log(`❌ WhatsApp no está conectado (negocio ${negocioId}, status: ${instance.status})`);
        return false;
      }

      // Formatear número para Argentina
      let num = String(number).replace(/\D/g, '');
      if (num.length === 10 && num.startsWith('11')) {
        num = '549' + num;
      } else if (num.length === 8) {
        num = '54911' + num;
      } else if (num.length === 10 && !num.startsWith('549')) {
        num = '54' + num;
      }
      const jid = num + '@s.whatsapp.net';

      // Verificar registro con timeout propio (no colgar la cola si WA no responde)
      let isRegistered = true;
      try {
        const check = instance.sock.onWhatsApp(jid);
        const [result] = await Promise.race([
          check,
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout onWhatsApp')), 10_000))
        ]);
        isRegistered = result?.exists ?? false;
      } catch (checkError) {
        console.log(`⚠️ No se pudo verificar registro (${num}): ${checkError.message} — se intenta enviar igual`);
        isRegistered = true;
      }

      if (!isRegistered) {
        console.log(`❌ El número ${num} no tiene WhatsApp`);
        return false;
      }

      await instance.sock.sendMessage(jid, { text: message });
      console.log(`✅ WhatsApp enviado (negocio ${negocioId} → ${num})`);

      instance.lastActivity = Date.now();
      this.resetIdleTimer(negocioId);
      return true;

    } catch (error) {
      console.error(`❌ Error enviando WhatsApp (negocio ${negocioId}):`, error.message);
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
        nuevo_a_preparacion: '¡Hola {{nombre_cliente}}! 👋\n\nRecibimos tu pedido *#{{numero_pedido}}* y ya lo estamos preparando con todo. 🍔🔥\n\nTe avisamos por acá cuando salga para tu casa. ¡Gracias por elegirnos! 🙌\n\n_Recordá que las promos y descuentos son solo en efectivo._',
        preparacion_a_listo: '¡Tu pedido *#{{numero_pedido}}* ya está listo! ✅\n\nEn unos minutos sale para tu domicilio 🛵💨\nPor favor estate atento/a para recibirlo. 📍',
        listo_a_en_camino: '¡Tu pedido *#{{numero_pedido}}* va en camino! 🛵🔥\n\nEl repartidor está llegando, ¡preparate para disfrutar! 😋',
        cualquier_a_cancelado: 'Hola {{nombre_cliente}}, tu pedido *#{{numero_pedido}}* fue cancelado. 😔\n\nSi fue un error o tenés alguna duda, escribinos y lo resolvemos. 🙏'
      },
      takeaway: {
        nuevo_a_preparacion: '¡Hola {{nombre_cliente}}! 👋\n\nRecibimos tu pedido *#{{numero_pedido}}* y ya lo estamos preparando. 🍔🔥\n\nTe avisamos por acá apenas esté listo para retirar. ¡Gracias por elegirnos! 🙌\n\n_Recordá que las promos y descuentos son solo en efectivo._',
        preparacion_a_listo: '¡Tu pedido *#{{numero_pedido}}* ya está listo para retirar! ✅🎉\n\nTe esperamos, ¡vení cuando quieras! 🏪😋',
        cualquier_a_cancelado: 'Hola {{nombre_cliente}}, tu pedido *#{{numero_pedido}}* fue cancelado. 😔\n\nSi fue un error o tenés alguna duda, escribinos. 🙏'
      }
    };
  }
}

// Exportar singleton
module.exports = new WhatsAppMultiTenantService();
