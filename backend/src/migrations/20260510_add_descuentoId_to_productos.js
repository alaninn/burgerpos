module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columna descuentoId a productos
    await queryInterface.addColumn('productos', 'descuentoId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'descuentos', key: 'id' },
      onDelete: 'SET NULL', // Si se elimina el descuento, setear NULL (no borrar producto)
      onUpdate: 'CASCADE'
    });

    // Agregar índice para mejorar queries
    await queryInterface.addIndex('productos', ['descuentoId'], {
      name: 'productos_descuentoId_idx'
    });

    // Índice compuesto para queries frecuentes (productos con descuento activo)
    await queryInterface.addIndex('productos', ['negocioId', 'descuentoId'], {
      name: 'productos_negocio_descuento_idx'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('productos', 'productos_negocio_descuento_idx');
    await queryInterface.removeIndex('productos', 'productos_descuentoId_idx');
    await queryInterface.removeColumn('productos', 'descuentoId');
  }
};
