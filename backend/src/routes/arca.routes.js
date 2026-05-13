const express = require('express');
const router = express.Router({ mergeParams: true }); // Para acceder a :negocioId del parent
const multer = require('multer');
const path = require('path');
const arcaController = require('../controllers/arca.controller');
const { protect } = require('../middleware/auth');

// Configuración multer para certificados
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/certificados'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.crt', '.key', '.csr', '.pem'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .crt, .key, .csr, .pem'));
    }
  }
});

// Todas las rutas requieren autenticación
router.use(protect);

// Certificados
router.post('/generar-certificados', arcaController.generarCertificados);
router.get('/descargar/:tipo/:filename', arcaController.descargarCertificado);
router.post('/subir-certificado', upload.single('certificado'), arcaController.subirCertificado);
router.get('/certificados', arcaController.listarCertificados);

// Facturación
router.post('/emitir', arcaController.emitirComprobante);
router.get('/comprobantes', arcaController.obtenerComprobantes);
router.get('/comprobantes/:comprobanteId/pdf', arcaController.descargarPDF);

// Utilidades
router.post('/test-conexion', arcaController.testConexion);
router.get('/tipos-comprobante/:regimenFiscal', arcaController.obtenerTiposComprobante);
router.get('/tipos-documento', arcaController.obtenerTiposDocumento);

// Vinculación automática (experimental)
router.post('/vincular-automatico', arcaController.vincularAutomatico);

module.exports = router;
