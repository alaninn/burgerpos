'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columna unidadContenidoCaja
    await queryInterface.addColumn('productos', 'unidadContenidoCaja', {
      type: Sequelize.ENUM('kg', 'litro', 'gramo', 'unidad'),
      allowNull: true,
      after: 'unidadCompra'
    });

    // Cambiar tipo de cantidadPorUnidadCompra de INTEGER a DECIMAL
    await queryInterface.changeColumn('productos', 'cantidadPorUnidadCompra', {
      type: Sequelize.DECIMAL(10, 3),
      defaultValue: 1
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir: eliminar columna
    await queryInterface.removeColumn('productos', 'unidadContenidoCaja');

    // Revertir: cambiar de vuelta a INTEGER
    await queryInterface.changeColumn('productos', 'cantidadPorUnidadCompra', {
      type: Sequelize.INTEGER,
      defaultValue: 1
    });
  }
};
