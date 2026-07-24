const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { WhatsAppConfig, Negocio, Producto, Categoria } = require('../models');
const geminiService = require('./geminiService');

class WhatsAppMultiTenantService {
  constructor() {
    this.instances = new Map(); // negocioId → { sock, qr, status, lastActivity }
    this.MAX_INSTANCES = 8; // Límite por RAM (1GB server)
    this.IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutos
    this.idleTimers = new Map(); // negocioId → timeout
    this.sendQueues = new Map(); // negocioId → Promise (cola FIFO de envios)
    this.reconnectAttempts = new Map(); // negocioId → contador de reintentos

    // Bot de atencion automatica: estado de conversacion por cliente.
    // key `${negocioId}:${jid}` → { ultimoContacto, respuestasIA, pausadoHasta }
    this.conversaciones = new Map();
    // IDs de los mensajes que mando el propio bot. WhatsApp los devuelve como
    // salientes igual que los que escribe una persona: sin esto, el bot leeria
    // su propia respuesta como "entro un humano" y se apagaria solo.
    this.mensajesPropios = new Map(); // messageId → timestamp
    this.CONVERSACION_WINDOW = 6 * 60 * 60 * 1000; // 6 horas
    this.MAX_RESPUESTAS_IA = 10; // tope por conversacion, evita loops y abuso

    // Cache del resumen del menu por negocio (solo cuando el bot "conoce el
    // menu"): evita pegarle a la DB en cada mensaje entrante.
    this.menuCache = new Map(); // negocioId → { texto, expira }
    this.MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    // Barrido periodico: sin esto el Map crece indefinidamente
    this.limpiezaConversaciones = setInterval(
      () => this.limpiarConversacionesVencidas(),
      60 * 60 * 1000
    );
    if (this.limpiezaConversaciones.unref) this.limpiezaConversaciones.unref();

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

      // Resetear idle timer en cada actividad + atender mensajes entrantes
      sock.ev.on('messages.upsert', (payload) => {
        this.resetIdleTimer(negocioId);

        // 'notify' = mensajes nuevos en vivo. 'append' es historial sincronizado
        // al conectar: responder eso inundaria de mensajes a clientes viejos.
        if (payload?.type !== 'notify') return;

        for (const msg of payload.messages || []) {
          // Un error acá no puede tirar el socket de WhatsApp
          this.procesarMensajeEntrante(negocioId, msg).catch((err) => {
            console.error(`Error procesando mensaje entrante (negocio ${negocioId}):`, err.message);
          });
        }
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

      const enviado = await instance.sock.sendMessage(jid, { text: message });
      // Registrar el ID para reconocer el eco de este mismo mensaje y no
      // confundirlo con la intervencion de una persona del equipo
      if (enviado?.key?.id) this.mensajesPropios.set(enviado.key.id, Date.now());
      console.log(`✅ WhatsApp enviado (negocio ${negocioId} → ${num})`);

      instance.lastActivity = Date.now();
      this.resetIdleTimer(negocioId);
      return true;

    } catch (error) {
      console.error(`❌ Error enviando WhatsApp (negocio ${negocioId}):`, error.message);
      return false;
    }
  }

  // ── Bot de atención automática ────────────────────────────

  /**
   * Extrae el texto plano de un mensaje de Baileys, sin importar en qué tipo
   * de bloque venga (texto suelto, respuesta citada, pie de foto).
   */
  extraerTexto(msg) {
    const m = msg?.message;
    if (!m) return '';
    return (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      m.buttonsResponseMessage?.selectedDisplayText ||
      m.listResponseMessage?.title ||
      ''
    ).trim();
  }

  /**
   * Decide qué responderle a un cliente según el estado de su conversación.
   * Devuelve 'saludo' (conversación nueva), 'ia' (consulta a responder con
   * IA) o 'espera' (se agotó el tope de respuestas con IA).
   */
  decidirAccion(clave) {
    const ahora = Date.now();
    const estado = this.conversaciones.get(clave);

    // Sin registro o ventana vencida: arranca conversación nueva
    if (!estado || ahora - estado.ultimoContacto >= this.CONVERSACION_WINDOW) {
      this.conversaciones.set(clave, { ultimoContacto: ahora, respuestasIA: 0 });
      return 'saludo';
    }

    estado.ultimoContacto = ahora;

    if (estado.respuestasIA >= this.MAX_RESPUESTAS_IA) return 'espera';

    estado.respuestasIA += 1;
    return 'ia';
  }

  /**
   * Marca que una persona del equipo entró a atender la conversación: a partir
   * de acá el bot se calla y no interrumpe. La pausa se renueva con cada
   * mensaje que escribe la persona y vence sola tras la ventana de conversación.
   */
  registrarTomaDeControlHumana(negocioId, jid) {
    const clave = `${negocioId}:${jid}`;
    const ahora = Date.now();
    const estado = this.conversaciones.get(clave) || { respuestasIA: 0 };

    estado.ultimoContacto = ahora;
    estado.pausadoHasta = ahora + this.CONVERSACION_WINDOW;
    this.conversaciones.set(clave, estado);

    console.log(`🤝 Atención manual detectada (negocio ${negocioId}) — bot en pausa para ese cliente`);
  }

  /**
   * Borra del Map las conversaciones cuya ventana ya venció y los IDs de
   * mensajes propios que nunca llegaron a confirmarse.
   */
  limpiarConversacionesVencidas() {
    const ahora = Date.now();
    for (const [clave, estado] of this.conversaciones.entries()) {
      if (ahora - estado.ultimoContacto >= this.CONVERSACION_WINDOW) {
        this.conversaciones.delete(clave);
      }
    }
    // El eco de un mensaje propio llega en segundos; lo que quede después de
    // 10 minutos es basura de un envío que falló
    for (const [id, ts] of this.mensajesPropios.entries()) {
      if (ahora - ts >= 10 * 60 * 1000) this.mensajesPropios.delete(id);
    }
  }

  /**
   * Atiende un mensaje entrante de un cliente: saluda y deriva al menú web,
   * responde consultas del negocio con IA, o avisa que en breve lo atiende
   * una persona. Nunca toma pedidos por texto.
   */
  async procesarMensajeEntrante(negocioId, msg) {
    const jid = msg?.key?.remoteJid;
    if (!jid || !jid.endsWith('@s.whatsapp.net')) return; // grupos, broadcast, status

    // Mensajes salientes: puede ser el eco del propio bot o una persona
    // del equipo escribiéndole al cliente desde el celular
    if (msg.key.fromMe) {
      const id = msg.key.id;
      if (id && this.mensajesPropios.has(id)) {
        this.mensajesPropios.delete(id); // era el bot: no hay nada que hacer
        return;
      }
      this.registrarTomaDeControlHumana(negocioId, jid);
      return;
    }

    const texto = this.extraerTexto(msg);
    if (!texto) return; // stickers, audios, ubicaciones: no hay nada que responder

    // El bot arranca apagado: solo responde si el negocio lo activó
    const botConfig = await this.getBotConfig(negocioId);
    if (!botConfig?.activo) return;

    const clave = `${negocioId}:${jid}`;

    // Si alguien del equipo ya está atendiendo esta conversación, el bot no
    // interrumpe: solo mantiene viva la conversación en memoria
    const estadoActual = this.conversaciones.get(clave);
    if (estadoActual?.pausadoHasta && Date.now() < estadoActual.pausadoHasta) {
      estadoActual.ultimoContacto = Date.now();
      return;
    }

    const negocio = await Negocio.findByPk(negocioId);
    if (!negocio) return;

    const accion = this.decidirAccion(clave);
    const numero = jid.split('@')[0].split(':')[0];

    if (accion === 'saludo') {
      const saludo = (botConfig.saludoInicial || '')
        .replace(/{{nombre_negocio}}/g, negocio.nombre || '')
        .replace(/{{link_menu}}/g, this.construirLinkMenu(negocio));
      if (saludo.trim()) await this.sendMessage(negocioId, numero, saludo);
      return;
    }

    if (accion === 'ia') {
      // Si Gemini falla, no contesta o la consulta se va de tema, devuelve null.
      // El try extra es a propósito: pase lo que pase con la IA, el cliente
      // tiene que recibir el mensaje de espera y no quedarse sin respuesta.
      let respuesta = null;
      try {
        // El menú solo se carga si el negocio activó "el bot conoce mi menú"
        const menuTexto = botConfig.conocerMenu ? await this.obtenerMenuResumen(negocioId) : '';
        respuesta = await geminiService.responderConsulta(negocio, texto, botConfig, menuTexto);
      } catch (error) {
        console.error(`Error inesperado de la IA (negocio ${negocioId}):`, error.message);
      }
      if (respuesta) {
        await this.sendMessage(negocioId, numero, respuesta);
        return;
      }
    }

    // 'espera', o la IA no pudo resolverlo: mensaje fijo del negocio
    const enEspera = (botConfig.enEspera || '').trim();
    if (enEspera) await this.sendMessage(negocioId, numero, enEspera);
  }

  /**
   * Arma el link público al menú del negocio (misma lógica que usa el prompt
   * de la IA, para que el cliente siempre reciba exactamente el mismo link)
   */
  construirLinkMenu(negocio) {
    return geminiService.construirLinkMenu(negocio);
  }

  /**
   * Arma un resumen del menú (productos activos, SIN precios) para inyectar al
   * prompt cuando el negocio activa "el bot conoce mi menú". Cacheado 5 min por
   * negocio: un mensaje entrante no debe disparar una query pesada cada vez.
   * Nunca lanza: si falla, devuelve '' y el bot sigue funcionando sin menú.
   */
  async obtenerMenuResumen(negocioId) {
    const cacheado = this.menuCache.get(negocioId);
    if (cacheado && Date.now() < cacheado.expira) return cacheado.texto;

    let texto = '';
    try {
      // Mismo criterio que el menú público: solo productos vendibles. Las
      // categorías de tipo 'ingrediente' son insumos de stock (carne, cebolla,
      // mayonesa) y NO se venden; los productos sin categoría tampoco aparecen
      // en la tienda. Así el bot no ofrece cosas que el cliente no puede pedir.
      const productos = await Producto.findAll({
        where: { negocioId, activo: true },
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['nombre'],
          where: { activo: true, tipo: { [Op.ne]: 'ingrediente' } },
          required: true
        }],
        order: [['orden', 'ASC'], ['nombre', 'ASC']],
        attributes: ['nombre', 'descripcion'],
        limit: 200 // tope defensivo: menús enormes no explotan el prompt
      });

      // Agrupar por categoría, sin precios (la fuente de verdad es el menú web)
      const porCategoria = new Map();
      for (const p of productos) {
        const cat = p.categoria?.nombre || 'Otros';
        if (!porCategoria.has(cat)) porCategoria.set(cat, []);
        const desc = (p.descripcion || '').trim().slice(0, 80);
        porCategoria.get(cat).push(desc ? `${p.nombre} (${desc})` : p.nombre);
      }

      const bloques = [];
      for (const [cat, items] of porCategoria.entries()) {
        bloques.push(`${cat}: ${items.join(', ')}`);
      }
      texto = bloques.join('\n');
    } catch (error) {
      console.error(`Error obteniendo menú para el bot (negocio ${negocioId}):`, error.message);
      texto = '';
    }

    this.menuCache.set(negocioId, { texto, expira: Date.now() + this.MENU_CACHE_TTL });
    return texto;
  }

  /**
   * Obtiene la configuración del bot de un negocio (con defaults)
   */
  async getBotConfig(negocioId) {
    try {
      const config = await WhatsAppConfig.findOne({ where: { negocioId } });
      return { ...this.getDefaultBotConfig(), ...(config?.config?.bot || {}) };
    } catch (error) {
      console.error(`Error obteniendo config del bot (negocio ${negocioId}):`, error.message);
      return this.getDefaultBotConfig();
    }
  }

  /**
   * Guarda la configuración del bot de un negocio
   */
  async saveBotConfig(negocioId, bot) {
    try {
      let config = await WhatsAppConfig.findOne({ where: { negocioId } });

      if (!config) {
        await WhatsAppConfig.create({ negocioId, config: { bot } });
      } else {
        await config.update({ config: { ...config.config, bot } });
      }

      console.log(`💾 Configuración del bot guardada para negocio: ${negocioId}`);
      return true;
    } catch (error) {
      console.error(`Error guardando config del bot (negocio ${negocioId}):`, error.message);
      return false;
    }
  }

  /**
   * Configuración por defecto del bot (apagado)
   */
  getDefaultBotConfig() {
    return {
      activo: false,
      nombre: '',
      tono: 'amigable',
      saludoInicial: '¡Hola! 👋 Gracias por escribirnos.\n\nMirá nuestro menú y hacé tu pedido acá 👉 {{link_menu}}\n\n_{{nombre_negocio}}_',
      enEspera: 'En breve te va a responder alguien de nuestro equipo. ¡Gracias por tu paciencia! 🙌',
      reglas: '',
      datosExtra: '',
      conocerMenu: false,
      faqs: []
    };
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
