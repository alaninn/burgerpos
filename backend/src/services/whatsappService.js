const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.qrCode = null;
    this.status = 'disconnected';
    this.ready = false;
    this.templates = this.loadTemplates();
    this.isInitializing = false;
    this.lastMessageTime = 0;
    
    // ✅ AUTO-INICIALIZACIÓN: Si existe sesión guardada, inicializar automáticamente
    this.checkAndAutoInit();
  }

  checkAndAutoInit() {
    // Verificamos si existe una sesión guardada
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
    
    // Esperamos 3 segundos después del arranque del servidor para dar tiempo a que todo se cargue
    setTimeout(() => {
      if (fs.existsSync(sessionPath)) {
        console.log('🔍 Sesión de WhatsApp detectada, inicializando automáticamente...');
        this.init();
      } else {
        console.log('ℹ️ No hay sesión de WhatsApp guardada. Esperando escaneo de QR desde configuración.');
      }
    }, 3000);
  }

  init() {
    if (this.isInitializing || this.client) {
      console.log('⚠️ WhatsApp ya está inicializándose o inicializado');
      return;
    }

    this.isInitializing = true;

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'burgerpos',
          dataPath: path.join(process.cwd(), '.wwebjs_auth')
        }),
        authTimeoutMs: 90000,
        qrMaxRetries: 10,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 0,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Actualizado a versión más reciente y estable
        webVersion: '2.2465.1',
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2465.1.html'
        },
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      });

      this.client.on('qr', (qr) => {
        this.qrCode = qr;
        this.status = 'pending';
        this.ready = false;
        console.log('📱 WhatsApp QR generado');
      });

      this.client.on('ready', () => {
        this.ready = true;
        this.status = 'connected';
        this.qrCode = null;
        this.isInitializing = false;
        console.log('✅ ✅ ✅ WhatsApp READY - Ya se pueden enviar mensajes ✅ ✅ ✅');
        
        // Verificación adicional de estado
        setTimeout(() => {
          this.verifyClientState();
        }, 2000);
      });

      this.client.on('authenticated', (session) => {
        console.log('🔐 WhatsApp autenticado correctamente');
        this.status = 'authenticated';
      });

      this.client.on('auth_failure', (msg) => {
        this.status = 'disconnected';
        this.ready = false;
        this.isInitializing = false;
        console.log('❌ Fallo en autenticación de WhatsApp:', msg);
      });

      this.client.on('disconnected', (reason) => {
        this.status = 'disconnected';
        this.ready = false;
        this.qrCode = null;
        this.client = null;
        this.isInitializing = false;
        console.log('❌ WhatsApp desconectado:', reason);
      });

      this.client.on('loading_screen', (percent, message) => {
        console.log(`📲 Cargando WhatsApp... ${percent}% - ${message}`);
      });

      setTimeout(() => {
        try {
          console.log('🚀 Inicializando cliente WhatsApp...');
          this.client.initialize();
        } catch (e) {
          console.log('❌ Error en inicialización:', e.message);
          this.isInitializing = false;
        }
      }, 2000);

      // Captura de errores mejorada
      this.client.on('error', (err) => {
        console.log('⚠️ Error WhatsApp:', err.message);
      });

      // Manejo global de errores
      const existingHandler = process.listeners('unhandledRejection')[0];
      process.removeAllListeners('unhandledRejection');
      
      process.on('unhandledRejection', (reason, promise) => {
        const errorMsg = reason?.message || '';
        if (errorMsg.includes('Execution context') || 
            errorMsg.includes('ProtocolError') ||
            errorMsg.includes('markedUnread') ||
            errorMsg.includes('Evaluation failed')) {
          console.log('⚠️ Error WhatsApp interno capturado (ignorado)');
          return;
        }
        if (existingHandler) {
          existingHandler(reason, promise);
        } else {
          console.error('Unhandled Rejection:', reason);
        }
      });

    } catch (error) {
      console.error('❌ Error inicializando WhatsApp:', error.message);
      this.isInitializing = false;
    }
  }

  async verifyClientState() {
    if (!this.client) return false;
    
    try {
      const state = await this.client.getState();
      console.log('🔍 Estado del cliente WhatsApp:', state);
      
      if (state === 'CONNECTED') {
        this.ready = true;
        this.status = 'connected';
        return true;
      } else {
        console.log('⚠️ Cliente no está en estado CONNECTED, estado actual:', state);
        this.ready = false;
        return false;
      }
    } catch (err) {
      console.log('⚠️ No se pudo verificar estado del cliente:', err.message);
      return false;
    }
  }

  getStatus() {
    return {
      status: this.status,
      ready: this.ready,
      hasQr: !!this.qrCode
    };
  }

  async getQrCode() {
    if (!this.client && !this.isInitializing) {
      this.init();
    }
    
    // Esperamos máximo 15 segundos a que se genere el QR
    for (let i = 0; i < 30; i++) {
      if (this.qrCode) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!this.qrCode) {
      console.log('❌ No se pudo generar código QR en el tiempo estimado');
      return null;
    }
    try {
      return await qrcode.toDataURL(this.qrCode);
    } catch {
      return null;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.logout();
      }
      this.ready = false;
      this.status = 'disconnected';
      this.qrCode = null;
      this.client = null;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.log('Error al desconectar:', err.message);
      return false;
    }
  }

  async sendMessage(number, message) {
    console.log(`\n📤 ========== INTENTO DE ENVÍO WHATSAPP ==========`);
    console.log(`📱 Número destino: ${number}`);
    console.log(`💬 Mensaje: ${message.substring(0, 50)}...`);
    
    // Verificación 1: Cliente existe
    if (!this.client) {
      console.log('❌ FALLO: No hay cliente WhatsApp inicializado');
      console.log('💡 Solución: Ve a Configuraciones → Integraciones y escanea el código QR');
      return false;
    }
    
    // Verificación 2: Estado del cliente
    console.log(`🔍 Estado actual: ${this.status} | Ready: ${this.ready}`);
    
    try {
      const clientState = await this.client.getState();
      console.log(`🔍 Estado del cliente: ${clientState}`);
      
      if (clientState !== 'CONNECTED') {
        console.log(`❌ FALLO: Cliente no está conectado (estado: ${clientState})`);
        console.log('💡 Solución: Espera a que WhatsApp se conecte o vuelve a escanear el QR');
        return false;
      }
    } catch (stateError) {
      console.log(`⚠️ No se pudo verificar estado (continuando): ${stateError.message}`);
    }

    // Anti-spam: máximo 1 mensaje por segundo
    const now = Date.now();
    if (now - this.lastMessageTime < 1000) {
      console.log('⏱️ Esperando 1 segundo entre mensajes...');
      await new Promise(r => setTimeout(r, 1000));
    }
    
    try {
      // Formateo de número para Argentina
      let num = number.replace(/\D/g, '');
      
      if (num.length === 10 && num.startsWith('11')) {
        num = '549' + num;
      } else if (num.length === 8) {
        num = '54911' + num;
      } else if (num.length === 10 && !num.startsWith('549')) {
        num = '54' + num;
      }
      
      console.log(`🔢 Número formateado: ${num}`);
      
      const chatId = num + '@c.us';
      
      // Verificar registro con timeout
      console.log('🔍 Verificando si el número está registrado en WhatsApp...');
      let isRegistered = false;
      
      try {
        const checkPromise = this.client.isRegisteredUser(chatId);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        isRegistered = await Promise.race([checkPromise, timeoutPromise]);
        console.log(`✅ Número ${isRegistered ? 'SÍ' : 'NO'} está registrado en WhatsApp`);
      } catch (checkError) {
        console.log(`⚠️ No se pudo verificar registro: ${checkError.message}`);
        console.log('🔄 Intentando enviar de todos modos...');
        isRegistered = true; // Asumimos que sí para intentar
      }

      if (!isRegistered) {
        console.log('❌ FALLO: El número no tiene WhatsApp');
        return false;
      }

      // Intentar envío con manejo robusto de errores
      console.log('📨 Enviando mensaje...');
      
      let enviado = false;
      let ultimoError = null;

      for (let intento = 1; intento <= 3; intento++) {
        try {
          console.log(`🔄 Intento ${intento}/3...`);
          
          // Crear promesa de envío con timeout de 10 segundos
          const sendPromise = this.client.sendMessage(chatId, message);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout de 10 segundos')), 10000)
          );
          
          await Promise.race([sendPromise, timeoutPromise]);
          
          console.log(`✅ ✅ ✅ MENSAJE ENVIADO EXITOSAMENTE ✅ ✅ ✅`);
          this.lastMessageTime = Date.now();
          enviado = true;
          break;
          
        } catch (sendError) {
          ultimoError = sendError;
          const errorMsg = sendError?.message || '';
          
          console.log(`⚠️ Intento ${intento} falló: ${errorMsg}`);
          
          // Errores que consideramos como "posiblemente enviado"
          if (errorMsg.includes('markedUnread') || 
              errorMsg.includes('Evaluation failed') ||
              errorMsg.includes('Cannot read properties')) {
            console.log(`🤔 Error de tracking, el mensaje PUEDE haberse enviado`);
            console.log(`💡 Verifica manualmente en WhatsApp si llegó`);
            enviado = true; // Lo marcamos como enviado porque probablemente sí llegó
            break;
          }
          
          // Errores graves que indican que NO se envió
          if (errorMsg.includes('not a contact') ||
              errorMsg.includes('Chat not found') ||
              errorMsg.includes('is not a WhatsApp user')) {
            console.log(`❌ ERROR DEFINITIVO: ${errorMsg}`);
            break;
          }
          
          // Si aún quedan intentos, esperamos antes de reintentar
          if (intento < 3) {
            const espera = intento * 1000;
            console.log(`⏳ Esperando ${espera}ms antes de reintentar...`);
            await new Promise(r => setTimeout(r, espera));
          }
        }
      }

      if (enviado) {
        console.log(`✅ Resultado final: ENVIADO`);
        console.log(`================================================\n`);
        return true;
      } else {
        console.log(`❌ Resultado final: FALLÓ después de 3 intentos`);
        console.log(`❌ Último error: ${ultimoError?.message || 'Desconocido'}`);
        console.log(`================================================\n`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ ERROR CRÍTICO al enviar mensaje:', error.message);
      console.log(`================================================\n`);
      return false;
    }
  }

  loadTemplates() {
    const templatesPath = path.join(__dirname, '../../whatsapp_templates.json');
    try {
      if (fs.existsSync(templatesPath)) {
        return JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
      }
    } catch (err) {
      console.log('No se pudieron cargar templates personalizados, usando defaults');
    }
    
    // Plantillas por defecto
    return {
      nuevo_pedido_admin: '🔔 NUEVO PEDIDO #{{numero_pedido}}\n\nCliente: {{nombre_cliente}}\nTeléfono: {{telefono}}\nTotal: ${{total}}\n\nDetalle:\n{{detalle_pedido}}',
      
      delivery: {
        nuevo_a_preparacion: '¡Hola! Tu pedido fue realizado y se encuentra en preparación.\nTe avisaremos por este medio cuando esté en camino!\nLas promociones y descuentos son validas solo en Efectivo.',
        preparacion_a_listo: 'Tu pedido ya está listo para ser entregado.\nen minutos sale hacia tu domicilio por favor estar atentos.',
        listo_a_en_camino: 'Tu pedido va en camino! Por favor este atento que el repartidor esta llegando.',
        cualquier_a_cancelado: 'Tu pedido ha sido cancelado.'
      },
      
      takeaway: {
        nuevo_a_preparacion: '¡Hola! Tu pedido fue realizado y se encuentra en preparación.\nTe avisaremos por este medio cuando esté Listo!\nLas promociones y descuentos son validas solo en Efectivo.',
        preparacion_a_listo: 'Tu pedido ya está listo para retirar. Podes venir cuando quieras!',
        cualquier_a_cancelado: ''
      }
    };
  }

  saveTemplates(templates) {
    const templatesPath = path.join(__dirname, '../../whatsapp_templates.json');
    this.templates = templates;
    try {
      fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2));
    } catch (err) {
      console.error('Error guardando templates:', err.message);
    }
  }

  renderTemplate(templateKey, variables) {
    let template = this.templates[templateKey] || '';
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return template;
  }
}

// Singleton
module.exports = new WhatsAppService();