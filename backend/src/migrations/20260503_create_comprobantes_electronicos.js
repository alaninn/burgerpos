module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('comprobantes_electronicos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      negocioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'negocios', key: 'id' },
        onDelete: 'CASCADE'
      },
      pedidoId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'pedidos', key: 'id' },
        onDelete: 'SET NULL'
      },
      cae: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      caeVencimiento: { type: Sequelize.DATE, allowNull: false },
      numeroComprobante: { type: Sequelize.INTEGER, allowNull: false },
      puntoVenta: { type: Sequelize.INTEGER, allowNull: false },
      tipoComprobante: { type: Sequelize.INTEGER, allowNull: false },
      letraComprobante: { type: Sequelize.STRING(1) },
      tipoDocumento: { type: Sequelize.INTEGER },
      numeroDocumento: { type: Sequelize.STRING(20) },
      denominacionComprador: { type: Sequelize.STRING(200) },
      importeTotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      importeNeto: { type: Sequelize.DECIMAL(12, 2) },
      importeIVA: { type: Sequelize.DECIMAL(12, 2) },
      xmlEnviado: { type: Sequelize.TEXT },
      xmlRespuesta: { type: Sequelize.TEXT },
      estado: {
        type: Sequelize.ENUM('emitido', 'anulado', 'error'),
        defaultValue: 'emitido'
      },
      fechaEmision: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.addIndex('comprobantes_electronicos', ['negocioId']);
    await queryInterface.addIndex('comprobantes_electronicos', ['pedidoId']);
    await queryInterface.addIndex('comprobantes_electronicos', ['cae'], { unique: true });
    await queryInterface.addIndex('comprobantes_electronicos', ['estado']);
    await queryInterface.addIndex('comprobantes_electronicos', ['fechaEmision']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('comprobantes_electronicos');
  }
};
