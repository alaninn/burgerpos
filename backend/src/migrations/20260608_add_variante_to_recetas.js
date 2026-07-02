module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Agregar columna varianteId
      await queryInterface.addColumn('recetas', 'varianteId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'producto_variantes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      // 2. Constraint único para producto-variante
      await queryInterface.addConstraint('recetas', {
        fields: ['productoMenuId', 'varianteId'],
        type: 'unique',
        name: 'unique_producto_variante_receta',
        where: {
          varianteId: { [Sequelize.Op.ne]: null }
        },
        transaction
      });

      // 3. Índice para performance
      await queryInterface.addIndex('recetas', ['varianteId'], { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('recetas', 'unique_producto_variante_receta');
    await queryInterface.removeIndex('recetas', ['varianteId']);
    await queryInterface.removeColumn('recetas', 'varianteId');
  }
};
