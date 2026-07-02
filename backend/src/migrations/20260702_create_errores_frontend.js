'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('errores_frontend', {
      id:        { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      negocioId: { type: Sequelize.UUID, allowNull: true },
      usuarioId: { type: Sequelize.UUID, allowNull: true },
      mensaje:   { type: Sequelize.TEXT, allowNull: false },
      stack:     { type: Sequelize.TEXT, allowNull: true },
      url:       { type: Sequelize.STRING(500), allowNull: true },
      userAgent: { type: Sequelize.STRING(300), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('errores_frontend', ['createdAt']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('errores_frontend');
  }
};
