'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Crear tabla recetas
      await queryInterface.createTable('recetas', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        negocioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'negocios',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        nombre: {
          type: Sequelize.STRING,
          allowNull: false
        },
        productoMenuId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'productos',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        activo: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notas: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // Índices para recetas
      await queryInterface.addIndex('recetas', ['negocioId'], { transaction });
      await queryInterface.addIndex('recetas', ['productoMenuId'], { transaction });
      await queryInterface.addIndex('recetas', ['activo'], { transaction });

      // 2. Crear tabla receta_ingredientes
      await queryInterface.createTable('receta_ingredientes', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        recetaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'recetas',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        ingredienteId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'productos',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        cantidad: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false
        },
        unidad: {
          type: Sequelize.STRING,
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // Índices para receta_ingredientes
      await queryInterface.addIndex('receta_ingredientes', ['recetaId'], { transaction });
      await queryInterface.addIndex('receta_ingredientes', ['ingredienteId'], { transaction });

      await transaction.commit();
      console.log('✅ Tablas de recetas creadas exitosamente');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al crear tablas de recetas:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('receta_ingredientes', { transaction });
      await queryInterface.dropTable('recetas', { transaction });

      await transaction.commit();
      console.log('✅ Tablas de recetas eliminadas exitosamente');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al eliminar tablas de recetas:', error);
      throw error;
    }
  }
};
