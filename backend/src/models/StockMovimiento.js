const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

// Movimiento de stock de un ingrediente: venta (salida por receta), compra
// (entrada) o reversion_compra (salida al eliminar una compra). La cantidad
// esta en la unidad base del producto y es siempre positiva.
const StockMovimiento = sequelize.define('StockMovimiento', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  negocioId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productoId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  cantidad: {
    type: DataTypes.DECIMAL(12, 3),
    allowNull: false
  },
  pedidoId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  compraId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'stock_movimientos',
  timestamps: true,
  indexes: [
    { fields: ['negocioId', 'createdAt'] },
    { fields: ['productoId'] }
  ]
});

module.exports = StockMovimiento;
