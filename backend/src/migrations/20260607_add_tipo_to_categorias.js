'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Crear el ENUM type
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_categorias_tipo" AS ENUM ('menu', 'stock');`,
        { transaction }
      );

      // 2. Agregar columna tipo
      await queryInterface.addColumn(
        'categorias',
        'tipo',
        {
          type: Sequelize.ENUM('menu', 'stock'),
          allowNull: false,
          defaultValue: 'menu'
        },
        { transaction }
      );

      // 3. Actualizar categorías existentes a tipo='menu'
      await queryInterface.sequelize.query(
        `UPDATE categorias SET tipo = 'menu' WHERE tipo IS NULL;`,
        { transaction }
      );

      // 4. Crear categoría "Ingredientes" tipo='stock'
      await queryInterface.sequelize.query(
        `INSERT INTO categorias (id, "negocioId", nombre, descripcion, tipo, activo, orden, modalidades, "createdAt", "updatedAt")
         SELECT
           gen_random_uuid(),
           n.id,
           'Ingredientes',
           'Productos e insumos para compras',
           'stock',
           true,
           999,
           '{"delivery": true, "takeaway": true, "salon": true}'::jsonb,
           NOW(),
           NOW()
         FROM negocios n
         WHERE NOT EXISTS (
           SELECT 1 FROM categorias c
           WHERE c."negocioId" = n.id AND c.tipo = 'stock'
         );`,
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
      // Eliminar categorías "Ingredientes" creadas por esta migración
      await queryInterface.sequelize.query(
        `DELETE FROM categorias WHERE nombre = 'Ingredientes' AND tipo = 'stock';`,
        { transaction }
      );

      // Eliminar columna tipo
      await queryInterface.removeColumn('categorias', 'tipo', { transaction });

      // Eliminar ENUM type
      await queryInterface.sequelize.query(
        `DROP TYPE "enum_categorias_tipo";`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
