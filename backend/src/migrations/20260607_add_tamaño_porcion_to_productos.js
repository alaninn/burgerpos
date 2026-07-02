'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('productos', 'tamañoPorcion', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Tamaño de cada porción en la unidad de venta (ej: 100 gramos, 250 ml)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('productos', 'tamañoPorcion');
  }
};
