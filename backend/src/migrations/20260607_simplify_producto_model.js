'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Agregar columna unidadBase
      await queryInterface.addColumn('productos', 'unidadBase', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'unidad'
      }, { transaction });

      // 2. Actualizar unidadBase basándose en datos existentes
      // Productos que se compran por peso probablemente tengan stock en gramos
      await queryInterface.sequelize.query(`
        UPDATE productos
        SET "unidadBase" = CASE
          WHEN "unidadCompra" IN ('kg', 'gramo') THEN 'gramo'
          WHEN "unidadCompra" IN ('litro', 'ml') THEN 'litro'
          ELSE 'unidad'
        END
      `, { transaction });

      // 3. Renombrar cantidadPorCaja a cantidadPorUnidadCompra
      await queryInterface.renameColumn('productos', 'cantidadPorCaja', 'cantidadPorUnidadCompra', { transaction });

      // 4. Para productos sin cantidadPorUnidadCompra, setear a 1
      await queryInterface.sequelize.query(`
        UPDATE productos
        SET "cantidadPorUnidadCompra" = 1
        WHERE "cantidadPorUnidadCompra" IS NULL
      `, { transaction });

      // 5. Eliminar columnas que se movieron a recetas
      await queryInterface.removeColumn('productos', 'unidadVenta', { transaction });
      await queryInterface.removeColumn('productos', 'tamañoPorcion', { transaction });
      await queryInterface.removeColumn('productos', 'factorConversion', { transaction });

      await transaction.commit();
      console.log('✅ Modelo Producto simplificado exitosamente');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al simplificar modelo Producto:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Restaurar columnas eliminadas
      await queryInterface.addColumn('productos', 'factorConversion', {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 1
      }, { transaction });

      await queryInterface.addColumn('productos', 'tamañoPorcion', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('productos', 'unidadVenta', {
        type: Sequelize.STRING,
        defaultValue: 'unidad'
      }, { transaction });

      // Renombrar de vuelta
      await queryInterface.renameColumn('productos', 'cantidadPorUnidadCompra', 'cantidadPorCaja', { transaction });

      // Eliminar unidadBase
      await queryInterface.removeColumn('productos', 'unidadBase', { transaction });

      await transaction.commit();
      console.log('✅ Modelo Producto restaurado exitosamente');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al restaurar modelo Producto:', error);
      throw error;
    }
  }
};
