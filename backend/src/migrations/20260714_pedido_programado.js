'use strict';

// El toggle "Pedidos programados" de Configuraciones permite que el cliente
// elija para que hora quiere su pedido (en vez de "lo antes posible").
module.exports = {
  async up(queryInterface, Sequelize) {
    const tabla = await queryInterface.describeTable('pedidos');
    if (!tabla.programadoPara) {
      await queryInterface.addColumn('pedidos', 'programadoPara', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const tabla = await queryInterface.describeTable('pedidos');
    if (tabla.programadoPara) {
      await queryInterface.removeColumn('pedidos', 'programadoPara');
    }
  }
};
