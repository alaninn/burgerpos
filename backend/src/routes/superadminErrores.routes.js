const express = require('express');
const router = express.Router();
const { protect, superAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/superadminErrores.controller');

// Todas las rutas son exclusivas del superadmin
router.use(protect, superAdmin);

// Visor de logs
router.get('/logs/en-vivo', ctrl.logsEnVivo);
router.get('/logs/archivo', ctrl.logsArchivo);

// Errores de pantalla reportados por el frontend
router.get('/errores-frontend', ctrl.listarErroresFrontend);

// Reporte de errores (descarga .md / subida a GitHub)
router.get('/errores/reporte', ctrl.descargarReporte);
router.post('/errores/subir-git', ctrl.subirReporteGit);

module.exports = router;
