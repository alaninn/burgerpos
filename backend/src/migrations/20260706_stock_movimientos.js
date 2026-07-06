'use strict';

// Historial de movimientos de stock de ingredientes: cada venta (descuento por
// receta), compra y reversion deja un registro. Con esto el Centro de Control
// puede desglosar los ingredientes consumidos en un periodo con exactitud,
// aunque despues se editen las recetas. Ademas agrega stockMinimo configurable
// por producto (el umbral fijo de 5 no sirve cuando la base es gramo).
// Migracion idempotente.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock_movimientos', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      negocioId:  { type: Sequelize.UUID, allowNull: false },
      productoId: { type: Sequelize.UUID, allowNull: false },
      // 'venta' (salida por receta) | 'compra' (entrada) | 'reversion_compra' (salida)
      tipo:       { type: Sequelize.STRING(20), allowNull: false },
      // Cantidad en la unidad base del producto, siempre positiva; el tipo define el signo.
      cantidad:   { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      pedidoId:   { type: Sequelize.UUID, allowNull: true },
      compraId:   { type: Sequelize.UUID, allowNull: true },
      createdAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    }).catch(() => {});
    await queryInterface.addIndex('stock_movimientos', ['negocioId', 'createdAt']).catch(() => {});
    await queryInterface.addIndex('stock_movimientos', ['productoId']).catch(() => {});

    const productos = await queryInterface.describeTable('productos');
    if (!productos.stockMinimo) {
      await queryInterface.addColumn('productos', 'stockMinimo', {
        type: Sequelize.DECIMAL(12, 3), allowNull: true
      });
    }

    // El item de compra ahora usa la unidad de compra configurada en el
    // producto ('gramo' singular), que faltaba en el enum del item.
    try {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_compra_items_unidadCompra" ADD VALUE IF NOT EXISTS 'gramo';`
      );
    } catch (e) {
      console.warn(`No se pudo alterar enum_compra_items_unidadCompra: ${e.message}`);
    }
  },

  down: async (queryInterface) => {
    try { await queryInterface.removeColumn('productos', 'stockMinimo'); } catch (e) {}
    try { await queryInterface.dropTable('stock_movimientos'); } catch (e) {}
  }
};
