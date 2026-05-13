module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pedidos', 'descuentos_detalles', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Desglose detallado de descuentos aplicados al pedido'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('pedidos', 'descuentos_detalles');
  }
};
