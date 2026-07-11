'use strict';

// Permite que cada item de compra elija su propia unidad de compra en el
// momento (ej: normalmente se compra por caja, pero esta vez se compro
// suelto por kg o por unidad), en vez de depender siempre del fraccionamiento
// fijo configurado en el producto. Se guarda por item para poder revertir la
// compra exactamente igual sin importar si despues cambia la config del
// producto.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tabla = await queryInterface.describeTable('compra_items');
    if (!tabla.cantidadPorUnidadCompra) {
      await queryInterface.addColumn('compra_items', 'cantidadPorUnidadCompra', {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      });
    }
    if (!tabla.unidadContenido) {
      await queryInterface.addColumn('compra_items', 'unidadContenido', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const tabla = await queryInterface.describeTable('compra_items');
    if (tabla.cantidadPorUnidadCompra) {
      await queryInterface.removeColumn('compra_items', 'cantidadPorUnidadCompra');
    }
    if (tabla.unidadContenido) {
      await queryInterface.removeColumn('compra_items', 'unidadContenido');
    }
  }
};
