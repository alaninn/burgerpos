'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Crear tipos ENUM
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_productos_unidad_compra AS ENUM ('caja', 'kg', 'litro', 'gramo', 'unidad');
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TYPE enum_productos_unidad_base AS ENUM ('unidad', 'kg', 'gramo', 'litro');
      `, { transaction });

      // 2. Convertir columnas a ENUM
      // Primero, crear columnas temporales con el tipo ENUM
      await queryInterface.sequelize.query(`
        ALTER TABLE productos
        ADD COLUMN unidad_compra_new enum_productos_unidad_compra;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE productos
        ADD COLUMN unidad_base_new enum_productos_unidad_base;
      `, { transaction });

      // 3. Copiar datos, mapeando a valores válidos del ENUM
      await queryInterface.sequelize.query(`
        UPDATE productos
        SET unidad_compra_new = CASE
          WHEN "unidadCompra" IN ('caja', 'kg', 'litro', 'gramo', 'unidad') THEN "unidadCompra"::enum_productos_unidad_compra
          ELSE 'unidad'::enum_productos_unidad_compra
        END;
      `, { transaction });

      await queryInterface.sequelize.query(`
        UPDATE productos
        SET unidad_base_new = CASE
          WHEN "unidadBase" IN ('unidad', 'kg', 'gramo', 'litro') THEN "unidadBase"::enum_productos_unidad_base
          ELSE 'unidad'::enum_productos_unidad_base
        END;
      `, { transaction });

      // 4. Eliminar columnas antiguas
      await queryInterface.removeColumn('productos', 'unidadCompra', { transaction });
      await queryInterface.removeColumn('productos', 'unidadBase', { transaction });

      // 5. Renombrar columnas nuevas
      await queryInterface.renameColumn('productos', 'unidad_compra_new', 'unidadCompra', { transaction });
      await queryInterface.renameColumn('productos', 'unidad_base_new', 'unidadBase', { transaction });

      // 6. Establecer valores por defecto
      await queryInterface.sequelize.query(`
        ALTER TABLE productos
        ALTER COLUMN "unidadCompra" SET DEFAULT 'unidad'::enum_productos_unidad_compra;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE productos
        ALTER COLUMN "unidadBase" SET DEFAULT 'unidad'::enum_productos_unidad_base;
      `, { transaction });

      await transaction.commit();
      console.log('✅ Campos de unidad convertidos a ENUM exitosamente');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al convertir unidades a ENUM:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Convertir de vuelta a STRING
      await queryInterface.changeColumn('productos', 'unidadCompra', {
        type: Sequelize.STRING,
        defaultValue: 'unidad'
      }, { transaction });

      await queryInterface.changeColumn('productos', 'unidadBase', {
        type: Sequelize.STRING,
        defaultValue: 'unidad'
      }, { transaction });

      // Eliminar tipos ENUM
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_productos_unidad_compra;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_productos_unidad_base;', { transaction });

      await transaction.commit();
      console.log('✅ Campos de unidad restaurados a STRING exitosamente');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al restaurar unidades a STRING:', error);
      throw error;
    }
  }
};
