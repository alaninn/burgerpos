module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('pedidos', 'comprobanteElectronicoId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'comprobantes_electronicos', key: 'id' },
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('pedidos', 'comprobanteElectronicoId');
  }
};
