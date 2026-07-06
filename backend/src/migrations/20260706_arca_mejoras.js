'use strict';

// Port de las mejoras de facturacion probadas en produccion (gestionQ24):
// - Conexion DELEGADA: el negocio delega el web service al CUIT del proveedor
//   y factura sin certificado propio (arca_credentials.modo = 'delegado').
// - comprobantes_electronicos guarda la fecha del comprobante (CbteFch) y la
//   condicion IVA del receptor (RG 5616, obligatoria en WSFEv1).
// - cae pasa a ser nullable: los intentos fallidos se guardan con estado
//   'error' y sin CAE (hoy el insert de error fallaba por el NOT NULL).
// Migracion idempotente.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cred = await queryInterface.describeTable('arca_credentials');
    if (!cred.modo) {
      await queryInterface.addColumn('arca_credentials', 'modo', {
        type: Sequelize.STRING(20), allowNull: false, defaultValue: 'propio'
      });
    }

    const comp = await queryInterface.describeTable('comprobantes_electronicos');
    if (!comp.cbteFecha) {
      await queryInterface.addColumn('comprobantes_electronicos', 'cbteFecha', {
        type: Sequelize.STRING(8), allowNull: true
      });
    }
    if (!comp.condicionIvaReceptor) {
      await queryInterface.addColumn('comprobantes_electronicos', 'condicionIvaReceptor', {
        type: Sequelize.INTEGER, allowNull: true
      });
    }
    // cae nullable + sin unique (los registros de error no tienen CAE)
    try {
      await queryInterface.sequelize.query('ALTER TABLE comprobantes_electronicos ALTER COLUMN cae DROP NOT NULL;');
    } catch (e) { console.warn('cae DROP NOT NULL:', e.message); }
    try {
      await queryInterface.sequelize.query('ALTER TABLE comprobantes_electronicos ALTER COLUMN "caeVencimiento" DROP NOT NULL;');
    } catch (e) { console.warn('caeVencimiento DROP NOT NULL:', e.message); }
    try {
      await queryInterface.sequelize.query('ALTER TABLE comprobantes_electronicos DROP CONSTRAINT IF EXISTS comprobantes_electronicos_cae_key;');
    } catch (e) { console.warn('cae drop unique:', e.message); }
  },

  down: async (queryInterface) => {
    try { await queryInterface.removeColumn('arca_credentials', 'modo'); } catch (e) {}
    try { await queryInterface.removeColumn('comprobantes_electronicos', 'cbteFecha'); } catch (e) {}
    try { await queryInterface.removeColumn('comprobantes_electronicos', 'condicionIvaReceptor'); } catch (e) {}
  }
};
