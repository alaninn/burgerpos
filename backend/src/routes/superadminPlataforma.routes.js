const express = require('express');
const router = express.Router();
const { protect, superAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/superadminPlataforma.controller');

// Todas las rutas son exclusivas del superadmin
router.use(protect, superAdmin);

// Planes editables
router.get('/planes', ctrl.listarPlanes);
router.put('/planes/:plan', ctrl.actualizarPlan);

// Finanzas / cobros
router.get('/finanzas', ctrl.finanzas);

// Alertas
router.get('/alertas', ctrl.listarAlertas);
router.put('/alertas/:id/resolver', ctrl.resolverAlerta);
router.post('/generar-alertas', ctrl.generarAlertasManual);

// Backups
router.get('/backups', ctrl.listarBackups);
router.post('/backups', ctrl.crearBackup);
router.get('/backups/:archivo/descargar', ctrl.descargarBackup);

// Contacto de la plataforma (WhatsApp para upgrades)
router.get('/contacto', ctrl.obtenerContacto);
router.put('/contacto', ctrl.guardarContacto);

// Tickets de soporte
router.get('/tickets', ctrl.listarTickets);
router.put('/tickets/:id', ctrl.actualizarTicket);

module.exports = router;
