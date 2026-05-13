module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('arca_credentials', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      negocioId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'negocios', key: 'id' },
        onDelete: 'CASCADE'
      },
      certPath: { type: Sequelize.TEXT },
      keyPath: { type: Sequelize.TEXT },
      csrPath: { type: Sequelize.TEXT },
      cuit: { type: Sequelize.STRING(15), allowNull: false },
      razonSocial: { type: Sequelize.STRING(200) },
      puntoVenta: { type: Sequelize.INTEGER, defaultValue: 1 },
      regimenFiscal: {
        type: Sequelize.ENUM('responsable_inscripto', 'monotributista'),
        allowNull: false
      },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      entornoProduccion: { type: Sequelize.BOOLEAN, defaultValue: false },
      fechaVencimiento: { type: Sequelize.DATE },
      condicionIVA: { type: Sequelize.STRING(100) },
      ingresosBrutos: { type: Sequelize.STRING(50) },
      inicioActividades: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.addIndex('arca_credentials', ['negocioId'], { unique: true });
    await queryInterface.addIndex('arca_credentials', ['activo']);
    await queryInterface.addIndex('arca_credentials', ['cuit']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('arca_credentials');
  }
};
