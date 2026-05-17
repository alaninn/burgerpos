const express = require('express');
const router = express.Router({ mergeParams: true }); // IMPORTANTE: recibe negocioId del padre
const { protect, perteneceAlNegocio } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

// Todas las rutas: /api/negocios/:negocioId/whatsapp/*

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

module.exports = router;
