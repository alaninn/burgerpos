'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // El stock puede ser fraccionario (kg, litros) — INTEGER perdía los decimales
    await queryInterface.changeColumn('productos', 'stock', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('productos', 'stock', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
