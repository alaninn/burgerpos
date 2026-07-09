'use strict';

// Agrega recetas.extraCosto: monto fijo en $ que se suma al costo de los
// ingredientes para cubrir merma, salsas caseras y desperdicio no medidos.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tabla = await queryInterface.describeTable('recetas');
    if (!tabla.extraCosto) {
      await queryInterface.addColumn('recetas', 'extraCosto', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      });
    }
  },

  async down(queryInterface) {
    const tabla = await queryInterface.describeTable('recetas');
    if (tabla.extraCosto) {
      await queryInterface.removeColumn('recetas', 'extraCosto');
    }
  }
};
