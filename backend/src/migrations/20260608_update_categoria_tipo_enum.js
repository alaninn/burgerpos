module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Paso 1: Eliminar el default para poder cambiar el tipo
      await queryInterface.sequelize.query(
        `ALTER TABLE categorias ALTER COLUMN tipo DROP DEFAULT;`,
        { transaction }
      );

      // Paso 2: Cambiar la columna a VARCHAR temporalmente
      await queryInterface.sequelize.query(
        `ALTER TABLE categorias ALTER COLUMN tipo TYPE VARCHAR(20);`,
        { transaction }
      );

      // Paso 3: Actualizar valores existentes
      // 'menu' -> 'elaborado' (productos elaborados como hamburguesas)
      // 'stock' -> 'ingrediente' (ingredientes como pan, carne)
      await queryInterface.sequelize.query(
        `UPDATE categorias SET tipo = 'elaborado' WHERE tipo = 'menu';`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE categorias SET tipo = 'ingrediente' WHERE tipo = 'stock';`,
        { transaction }
      );

      // Paso 4: Eliminar el tipo enum viejo
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_categorias_tipo";`,
        { transaction }
      );

      // Paso 5: Crear el nuevo enum con 3 valores
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_categorias_tipo" AS ENUM('elaborado', 'ingrediente', 'producto');`,
        { transaction }
      );

      // Paso 6: Convertir la columna de nuevo a ENUM
      await queryInterface.sequelize.query(
        `ALTER TABLE categorias ALTER COLUMN tipo TYPE "enum_categorias_tipo" USING tipo::"enum_categorias_tipo";`,
        { transaction }
      );

      // Paso 7: Establecer el nuevo default
      await queryInterface.sequelize.query(
        `ALTER TABLE categorias ALTER COLUMN tipo SET DEFAULT 'elaborado';`,
        { transaction }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Cambiar a VARCHAR
      await queryInterface.sequelize.query(
        `ALTER TABLE categorias ALTER COLUMN tipo TYPE VARCHAR(20);`,
        { transaction }
      );

      // Revertir: convertir tipos nuevos a viejos
      await queryInterface.sequelize.query(
        `UPDATE categorias SET tipo = 'menu' WHERE tipo IN ('elaborado', 'producto');`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE categorias SET tipo = 'stock' WHERE tipo = 'ingrediente';`,
        { transaction }
      );

      // Eliminar enum nuevo
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_categorias_tipo";`,
        { transaction }
      );

      // Crear enum viejo
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_categorias_tipo" AS ENUM('menu', 'stock');`,
        { transaction }
      );

      // Volver al enum original
      await queryInterface.sequelize.query(
        `ALTER TABLE categorias ALTER COLUMN tipo TYPE "enum_categorias_tipo" USING tipo::"enum_categorias_tipo";`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE categorias ALTER COLUMN tipo SET DEFAULT 'menu';`,
        { transaction }
      );
    });
  }
};
