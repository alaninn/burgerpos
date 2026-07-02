const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Compra = sequelize.define('Compra', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  negocioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'negocios',
      key: 'id'
    }
  },
  proveedorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'proveedores',
      key: 'id'
    }
  },
  numeroFactura: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  estado: {
    type: DataTypes.ENUM('borrador', 'confirmada', 'cancelada'),
    allowNull: false,
    defaultValue: 'confirmada'
  },
  pagado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  fechaPago: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  metodoPago: {
    type: DataTypes.ENUM('efectivo', 'transferencia', 'tarjeta'),
    allowNull: true
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipoFactura: {
    type: DataTypes.ENUM('A', 'B', 'X'),
    allowNull: true
  }
}, {
  tableName: 'compras',
  timestamps: true,
  indexes: [
    { fields: ['negocioId'] },
    { fields: ['proveedorId'] },
    { fields: ['fecha'] },
    { fields: ['estado'] },
    { fields: ['pagado'] }
  ]
});

module.exports = Compra;
