'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Crear el ENUM type
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_compras_tipoFactura" AS ENUM ('A', 'B', 'X');`,
        { transaction }
      );

      // 2. Agregar columna tipoFactura
      await queryInterface.addColumn(
        'compras',
        'tipoFactura',
        {
          type: Sequelize.ENUM('A', 'B', 'X'),
          allowNull: true
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Eliminar columna tipoFactura
      await queryInterface.removeColumn('compras', 'tipoFactura', { transaction });

      // Eliminar ENUM type
      await queryInterface.sequelize.query(
        `DROP TYPE "enum_compras_tipoFactura";`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
