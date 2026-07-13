'use strict';

// "Receta especial": combina productos de stock para crear un nuevo producto
// intermedio (ej: salsa alioli hecha con mayonesa + ajo + otros), que a su vez
// puede usarse como ingrediente de otras recetas. cantidadProducida guarda
// cuanto rinde la receta (en la unidad base del producto resultante, ej. 500
// gramos); una receta normal de menu no la usa (queda null).
module.exports = {
  async up(queryInterface, Sequelize) {
    const tabla = await queryInterface.describeTable('recetas');
    if (!tabla.cantidadProducida) {
      await queryInterface.addColumn('recetas', 'cantidadProducida', {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const tabla = await queryInterface.describeTable('recetas');
    if (tabla.cantidadProducida) {
      await queryInterface.removeColumn('recetas', 'cantidadProducida');
    }
  }
};
