'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('whatsapp_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      negocioId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        field: 'negocioId',
        references: {
          model: 'negocios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sessionData: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('disconnected', 'connecting', 'connected', 'error'),
        defaultValue: 'disconnected',
        allowNull: false
      },
      qrCode: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lastActivity: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: true
      },
      config: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Crear índice para búsquedas por negocioId
    await queryInterface.addIndex('whatsapp_configs', ['negocioId'], {
      name: 'whatsapp_configs_negocioId_idx'
    });

    // Crear índice para búsquedas por status
    await queryInterface.addIndex('whatsapp_configs', ['status'], {
      name: 'whatsapp_configs_status_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Eliminar enum type primero requiere eliminar la tabla
    await queryInterface.dropTable('whatsapp_configs');

    // Eliminar el tipo ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_whatsapp_configs_status";');
  }
};
