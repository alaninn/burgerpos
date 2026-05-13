module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tickets_acceso_wsaa', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      negocioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'negocios', key: 'id' },
        onDelete: 'CASCADE'
      },
      servicio: { type: Sequelize.STRING(50), defaultValue: 'wsfe' },
      token: { type: Sequelize.TEXT, allowNull: false },
      sign: { type: Sequelize.TEXT, allowNull: false },
      expiracion: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.addIndex('tickets_acceso_wsaa', ['negocioId', 'servicio']);
    await queryInterface.addIndex('tickets_acceso_wsaa', ['expiracion']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tickets_acceso_wsaa');
  }
};
