const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const CompraItem = sequelize.define('CompraItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  compraId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'compras',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  productoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'productos',
      key: 'id'
    }
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cantidadCompra: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  unidadCompra: {
    type: DataTypes.ENUM('caja', 'kg', 'gramos', 'unidad', 'litro', 'ml', 'gramo'),
    allowNull: false,
    defaultValue: 'unidad'
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  actualizaStock: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'compra_items',
  timestamps: true,
  indexes: [
    { fields: ['compraId'] },
    { fields: ['productoId'] }
  ]
});

module.exports = CompraItem;
