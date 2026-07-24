const express = require('express');
const router = express.Router({ mergeParams: true }); // IMPORTANTE: recibe negocioId del padre
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const geminiService = require('../services/geminiService');
const { Negocio } = require('../models');

// Todas las rutas: /api/negocios/:negocioId/whatsapp/*

// Topes de longitud/cantidad: todo esto va directo al prompt de un LLM, así que
// se sanitiza en el servidor sin confiar en la validación del formulario.
const MAX_TEXTO = 2000;
const MAX_MENSAJE_FIJO = 1000;
const MAX_FAQS = 30;
const MAX_FAQ_CAMPO = 500;

/**
 * Normaliza y recorta la configuración del bot que llega del cliente. Cualquier
 * clave desconocida se descarta; cada campo se valida por tipo y longitud.
 */
function sanitizarBot(bot) {
  const defaults = whatsappService.getDefaultBotConfig();
  const str = (v, max, fallback) => (typeof v === 'string' ? v.slice(0, max) : fallback);

  const tono = geminiService.TONOS_VALIDOS.includes(bot?.tono) ? bot.tono : defaults.tono;

  let faqs = [];
  if (Array.isArray(bot?.faqs)) {
    faqs = bot.faqs
      .filter((f) => f && typeof f.pregunta === 'string' && typeof f.respuesta === 'string')
      .slice(0, MAX_FAQS)
      .map((f) => ({
        pregunta: f.pregunta.slice(0, MAX_FAQ_CAMPO),
        respuesta: f.respuesta.slice(0, MAX_FAQ_CAMPO)
      }))
      .filter((f) => f.pregunta.trim() && f.respuesta.trim());
  }

  return {
    activo: bot?.activo === true,
    nombre: str(bot?.nombre, 40, defaults.nombre).trim(),
    tono,
    saludoInicial: str(bot?.saludoInicial, MAX_MENSAJE_FIJO, defaults.saludoInicial),
    enEspera: str(bot?.enEspera, MAX_MENSAJE_FIJO, defaults.enEspera),
    reglas: str(bot?.reglas, MAX_TEXTO, defaults.reglas),
    datosExtra: str(bot?.datosExtra, MAX_TEXTO, defaults.datosExtra),
    conocerMenu: bot?.conocerMenu === true,
    faqs
  };
}

/**
 * GET /status
 * Obtiene el estado de conexión de WhatsApp para este negocio
 */
router.get('/status', protect, perteneceAlNegocio, async (req, res) => {
  try {
    const { negocioId } = req.params;
    const status = await whatsappService.getStatus(negocioId);
    res.json(status);
  } catch (error) {
    console.error('Error obteniendo status WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /qr
 * Genera y retorna el código QR para vincular WhatsApp
 */
router.get('/qr', protect, perteneceAlNegocio, async (req, res) => {
  try {
    const { negocioId } = req.params;
    const qrData = await whatsappService.getQrCode(negocioId);

    if (!qrData) {
      return res.status(408).json({ error: 'Timeout generando QR' });
    }

    res.json({ qr: qrData });
  } catch (error) {
    console.error('Error generando QR WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /disconnect
 * Desconecta WhatsApp para este negocio
 */
router.post('/disconnect', protect, perteneceAlNegocio, async (req, res) => {
  try {
    const { negocioId } = req.params;
    const success = await whatsappService.disconnect(negocioId);

    if (success) {
      res.json({ success: true, message: 'WhatsApp desconectado correctamente' });
    } else {
      res.status(500).json({ success: false, error: 'Error al desconectar' });
    }
  } catch (error) {
    console.error('Error desconectando WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /templates
 * Guarda templates personalizados de mensajes
 */
router.put('/templates', protect, perteneceAlNegocio, async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { templates } = req.body;

    if (!templates) {
      return res.status(400).json({ error: 'Templates requeridos' });
    }

    const success = await whatsappService.saveTemplates(negocioId, templates);

    if (success) {
      res.json({ success: true, message: 'Templates guardados correctamente' });
    } else {
      res.status(500).json({ success: false, error: 'Error guardando templates' });
    }
  } catch (error) {
    console.error('Error guardando templates WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /templates
 * Obtiene templates actuales
 */
router.get('/templates', protect, perteneceAlNegocio, async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { WhatsAppConfig } = require('../models');

    const config = await WhatsAppConfig.findOne({ where: { negocioId } });

    if (config && config.config && config.config.templates) {
      res.json({ templates: config.config.templates });
    } else {
      // Retornar templates por defecto
      res.json({ templates: whatsappService.getDefaultTemplates() });
    }
  } catch (error) {
    console.error('Error obteniendo templates WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /bot-config
 * Obtiene la configuración del bot de atención automática
 */
router.get('/bot-config', protect, perteneceAlNegocio, async (req, res) => {
  try {
    const { negocioId } = req.params;
    const bot = await whatsappService.getBotConfig(negocioId);
    res.json({ bot });
  } catch (error) {
    console.error('Error obteniendo config del bot WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /bot-config
 * Guarda la configuración del bot de atención automática
 */
router.put('/bot-config', protect, perteneceAlNegocio, async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { bot } = req.body;

    if (!bot || typeof bot !== 'object') {
      return res.status(400).json({ error: 'Configuración del bot requerida' });
    }

    const limpio = sanitizarBot(bot);
    const success = await whatsappService.saveBotConfig(negocioId, limpio);

    if (success) {
      res.json({ success: true, message: 'Configuración del bot guardada correctamente', bot: limpio });
    } else {
      res.status(500).json({ success: false, error: 'Error guardando configuración del bot' });
    }
  } catch (error) {
    console.error('Error guardando config del bot WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /bot-config/probar
 * Banco de pruebas: simula una respuesta del bot con la configuración enviada,
 * sin guardarla ni mandar nada por WhatsApp. Permite probar cambios en vivo.
 */
router.post('/bot-config/probar', protect, perteneceAlNegocio, async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { mensaje, bot } = req.body;

    if (typeof mensaje !== 'string' || !mensaje.trim()) {
      return res.status(400).json({ error: 'Falta el mensaje de prueba' });
    }

    const botConfig = sanitizarBot(bot || {});
    const negocio = await Negocio.findByPk(negocioId);
    if (!negocio) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Mismo menú que usaría en producción, solo si el bot lo tiene activado
    const menuTexto = botConfig.conocerMenu ? await whatsappService.obtenerMenuResumen(negocioId) : '';
    const respuestaIA = await geminiService.responderConsulta(negocio, mensaje, botConfig, menuTexto);

    // Si la IA no puede resolver (fuera de contexto / sin API key / error),
    // se muestra el mismo mensaje de espera que recibiría el cliente real
    const respuesta = respuestaIA || botConfig.enEspera;
    const sinIA = !process.env.GEMINI_API_KEY;

    res.json({ respuesta, derivado: !respuestaIA, sinIA });
  } catch (error) {
    console.error('Error en banco de pruebas del bot:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
