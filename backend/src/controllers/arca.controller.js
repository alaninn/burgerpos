const arcaService = require('../services/arcaService');
const wsaaService = require('../services/wsaaService');
const { ARCACredential, ComprobanteElectronico } = require('../models');
const encryptionService = require('../services/encryptionService');
const path = require('path');
const fs = require('fs');

/**
 * Genera certificados RSA + CSR
 * POST /api/negocios/:negocioId/arca/generar-certificados
 */
exports.generarCertificados = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { cuit, razonSocial } = req.body;

    // Validar negocio pertenece al usuario
    if (req.usuario.negocioId !== negocioId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const resultado = await arcaService.generarCertificados(cuit, razonSocial);

    // Guardar paths en BD (solo key y csr, cert viene después)
    const keyPathEncrypted = encryptionService.encrypt(resultado.keyPath);
    const csrPathEncrypted = encryptionService.encrypt(resultado.csrPath);

    await ARCACredential.findOrCreate({
      where: { negocioId },
      defaults: {
        keyPath: keyPathEncrypted,
        csrPath: csrPathEncrypted,
        cuit,
        razonSocial,
        regimenFiscal: 'responsable_inscripto', // Default
        activo: false // Aún no tiene .crt
      }
    });

    res.json({
      exito: true,
      mensaje: 'Certificados generados. Descarga los archivos y sube el .csr a ARCA',
      archivos: {
        keyPath: resultado.keyPath,
        csrPath: resultado.csrPath
      }
    });
  } catch (error) {
    console.error('Error generando certificados:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Descarga archivo de certificado
 * GET /api/negocios/:negocioId/arca/descargar/:tipo/:filename
 */
exports.descargarCertificado = async (req, res) => {
  try {
    const { negocioId, filename } = req.params;

    if (req.usuario.negocioId !== negocioId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Sanitizar el nombre: solo el archivo, sin componentes de ruta (evita
    // path traversal tipo ..%2F..%2F.env que expondria secretos del servidor)
    const nombreSeguro = path.basename(filename);
    const dirCertificados = path.resolve(__dirname, '../../uploads/certificados');
    const filePath = path.join(dirCertificados, nombreSeguro);

    if (!filePath.startsWith(dirCertificados + path.sep) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Sube certificado .crt de ARCA
 * POST /api/negocios/:negocioId/arca/subir-certificado
 */
exports.subirCertificado = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { cuit, regimenFiscal } = req.body;

    if (req.usuario.negocioId !== negocioId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    const certPath = `certificados/${req.file.filename}`;

    // Buscar .key y .csr existentes
    const credential = await ARCACredential.findOne({ where: { negocioId } });

    if (!credential || !credential.keyPath) {
      return res.status(400).json({
        error: 'Debes generar certificados primero (.key y .csr)'
      });
    }

    const keyPath = encryptionService.decrypt(credential.keyPath);
    const csrPath = credential.csrPath ? encryptionService.decrypt(credential.csrPath) : null;

    await arcaService.guardarCertificadoNegocio(
      negocioId,
      certPath,
      keyPath,
      csrPath,
      cuit,
      regimenFiscal
    );

    res.json({ exito: true, mensaje: 'Certificado guardado exitosamente' });
  } catch (error) {
    console.error('Error subiendo certificado:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lista certificados del negocio
 * GET /api/negocios/:negocioId/arca/certificados
 */
exports.listarCertificados = async (req, res) => {
  try {
    const { negocioId } = req.params;

    if (req.usuario.negocioId !== negocioId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const credential = await ARCACredential.findOne({
      where: { negocioId },
      attributes: ['id', 'cuit', 'razonSocial', 'regimenFiscal', 'puntoVenta', 'activo', 'entornoProduccion', 'fechaVencimiento', 'createdAt']
    });

    res.json(credential || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Emite comprobante electrónico
 * POST /api/negocios/:negocioId/arca/emitir
 */
exports.emitirComprobante = async (req, res) => {
  try {
    const { negocioId } = req.params;

    if (req.usuario.negocioId !== negocioId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const resultado = await arcaService.emitirComprobante({
      negocioId,
      ...req.body
    });

    console.log(`[ARCA] Negocio ${negocioId} emitió comprobante tipo ${req.body.tipoComprobante}`);

    res.json(resultado);
  } catch (error) {
    console.error('Error emitiendo comprobante:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtiene historial de comprobantes
 * GET /api/negocios/:negocioId/arca/comprobantes
 */
exports.obtenerComprobantes = async (req, res) => {
  try {
    const { negocioId } = req.params;

    if (req.usuario.negocioId !== negocioId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const comprobantes = await arcaService.obtenerComprobantes(negocioId, req.query);

    res.json(comprobantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test de conexión WSAA
 * POST /api/negocios/:negocioId/arca/test-conexion
 */
exports.testConexion = async (req, res) => {
  try {
    const { negocioId } = req.params;

    if (req.usuario.negocioId !== negocioId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const ticket = await wsaaService.obtenerTicketAcceso(negocioId, 'wsfe');

    res.json({
      exito: true,
      mensaje: 'Conexión exitosa con WSAA',
      ticket: {
        tokenPreview: ticket.token.substring(0, 50) + '...'
      }
    });
  } catch (error) {
    res.status(500).json({ exito: false, error: error.message });
  }
};

/**
 * Obtiene tipos de comprobante según régimen fiscal
 * GET /api/negocios/:negocioId/arca/tipos-comprobante/:regimenFiscal
 */
exports.obtenerTiposComprobante = async (req, res) => {
  try {
    const { regimenFiscal } = req.params;
    const tipos = arcaService.obtenerTiposComprobante(regimenFiscal);
    res.json(tipos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtiene tipos de documento para facturación
 * GET /api/negocios/:negocioId/arca/tipos-documento
 */
exports.obtenerTiposDocumento = async (req, res) => {
  try {
    const tipos = arcaService.obtenerTiposDocumento();
    res.json(tipos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Descarga comprobante como PDF
 * GET /api/negocios/:negocioId/arca/comprobantes/:comprobanteId/pdf
 */
exports.descargarPDF = async (req, res) => {
  try {
    const { negocioId, comprobanteId } = req.params;
    const pdfService = require('../services/pdfService');
    const { ComprobanteElectronico, ARCACredential, Negocio } = require('../models');

    // Obtener comprobante con relaciones
    const comprobante = await ComprobanteElectronico.findOne({
      where: { id: comprobanteId, negocioId },
      include: [
        {
          model: Negocio,
          as: 'negocio',
          include: [{ model: ARCACredential, as: 'arcaCredential' }]
        }
      ]
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    // Generar PDF
    const pdfBuffer = await pdfService.generarPDFComprobante(comprobante, comprobante.negocio);

    // Nombre del archivo
    const fileName = `comprobante-${comprobante.cae}.pdf`;

    // Enviar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Vinculación automática con ARCA
 * POST /api/negocios/:negocioId/arca/vincular-automatico
 */
exports.vincularAutomatico = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { cuit, claveFiscal, puntoVenta, razonSocial, regimenFiscal, esHomologacion } = req.body;

    // Validar que el usuario pertenece al negocio
    if (req.usuario.negocioId !== negocioId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Validar campos requeridos
    if (!cuit || !claveFiscal || !puntoVenta) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: cuit, claveFiscal, puntoVenta'
      });
    }

    console.log(`\n🚀 Iniciando vinculación automática para negocio ${negocioId}...`);
    console.log(`   CUIT: ${cuit}`);
    console.log(`   Punto de Venta: ${puntoVenta}`);
    console.log(`   Régimen: ${regimenFiscal || 'No especificado'}`);
    console.log(`   Homologación: ${esHomologacion ? 'Sí' : 'No'}`);

    const arcaAutomationService = require('../services/arcaAutomationService');

    const resultado = esHomologacion
      ? await arcaAutomationService.vincularHomologacion({
          cuit,
          claveFiscal,
          puntoVenta,
          razonSocial: razonSocial || 'Negocio',
          negocioId,
          regimenFiscal: regimenFiscal || 'responsable_inscripto'
        })
      : await arcaAutomationService.vincularAutomatico({
          cuit,
          claveFiscal,
          puntoVenta,
          razonSocial: razonSocial || 'Negocio',
          negocioId,
          regimenFiscal: regimenFiscal || 'responsable_inscripto'
        });

    if (resultado.exito) {
      res.json({
        exito: true,
        mensaje: resultado.mensaje,
        pasos: resultado.pasos,
        certificado: resultado.certificadoPath
      });
    } else {
      res.status(500).json({
        exito: false,
        mensaje: resultado.mensaje,
        pasos: resultado.pasos,
        errors: resultado.errors
      });
    }
  } catch (error) {
    console.error('❌ Error en vinculación automática:', error);
    res.status(500).json({
      exito: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Info de la conexión delegada: disponible en este servidor y a qué CUIT delegar
 * GET /api/negocios/:negocioId/arca/delegacion-info
 */
exports.delegacionInfo = async (req, res) => {
  const delegado = wsaaService.obtenerCertDelegado();
  res.json({
    disponible: delegado.disponible,
    cuitProveedor: delegado.disponible ? delegado.cuit : null,
    error: delegado.disponible ? null : delegado.error
  });
};

/**
 * Activa la conexión delegada: el negocio delegó el web service de facturación
 * (wsfe) al CUIT del proveedor desde la web de ARCA, y factura sin certificado
 * propio. Portado de gestionQ24.
 * POST /api/negocios/:negocioId/arca/activar-delegacion
 */
exports.activarDelegacion = async (req, res) => {
  try {
    const { negocioId } = req.params;

    if (req.usuario.negocioId !== negocioId && req.usuario.rol !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const delegado = wsaaService.obtenerCertDelegado();
    if (!delegado.disponible) {
      return res.status(400).json({ error: 'La conexión delegada no está disponible en este servidor. Contactá a soporte.' });
    }

    const { cuit, puntoVenta, regimenFiscal, razonSocial } = req.body;
    const cuitLimpio = String(cuit || '').replace(/[-\s]/g, '');
    if (!/^\d{11}$/.test(cuitLimpio)) {
      return res.status(400).json({ error: 'Ingresá un CUIT válido de 11 dígitos' });
    }

    const { ARCACredential, TicketAccesoWSAA } = require('../models');

    // Reemplazar cualquier configuración anterior (certificado propio o delegación vieja)
    const [credential, created] = await ARCACredential.findOrCreate({
      where: { negocioId },
      defaults: {
        cuit: cuitLimpio,
        puntoVenta: parseInt(puntoVenta) || 1,
        regimenFiscal: regimenFiscal || 'responsable_inscripto',
        razonSocial: razonSocial || null,
        activo: true,
        modo: 'delegado',
        entornoProduccion: true
      }
    });

    if (!created) {
      await credential.update({
        cuit: cuitLimpio,
        puntoVenta: parseInt(puntoVenta) || 1,
        regimenFiscal: regimenFiscal || 'responsable_inscripto',
        razonSocial: razonSocial || credential.razonSocial,
        activo: true,
        modo: 'delegado',
        entornoProduccion: true,
        certPath: null,
        keyPath: null,
        csrPath: null
      });
    }

    // Invalidar tickets cacheados del negocio (por si venía de modo propio)
    await TicketAccesoWSAA.destroy({ where: { negocioId } });

    res.json({
      exito: true,
      mensaje: 'Conexión delegada activada. Probá la conexión para confirmar que la delegación en ARCA esté hecha.',
      certificado: credential.toJSON()
    });
  } catch (error) {
    console.error('❌ Error activando delegación:', error);
    res.status(500).json({ error: 'Error al activar la conexión delegada' });
  }
};
