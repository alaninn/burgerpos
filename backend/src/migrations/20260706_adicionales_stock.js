'use strict';

// Los adicionales (ketchup, medallon extra, etc.) pueden vincularse a un
// ingrediente del stock con una cantidad fija: al venderse, descuentan ese
// stock y su costo real sale del ingrediente (ej: medallon extra = 100 gramos
// de carne). Migracion idempotente.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adic = await queryInterface.describeTable('adicionales');
    if (!adic.ingredienteId) {
      await queryInterface.addColumn('adicionales', 'ingredienteId', {
        type: Sequelize.UUID, allowNull: true
      });
    }
    if (!adic.cantidadIngrediente) {
      await queryInterface.addColumn('adicionales', 'cantidadIngrediente', {
        type: Sequelize.DECIMAL(12, 3), allowNull: true
      });
    }
    if (!adic.unidadIngrediente) {
      await queryInterface.addColumn('adicionales', 'unidadIngrediente', {
        type: Sequelize.STRING(10), allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    for (const c of ['ingredienteId', 'cantidadIngrediente', 'unidadIngrediente']) {
      try { await queryInterface.removeColumn('adicionales', c); } catch (e) {}
    }
  }
};
