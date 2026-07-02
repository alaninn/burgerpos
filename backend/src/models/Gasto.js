const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Gasto = sequelize.define('Gasto', {
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
    allowNull: true,
    references: {
      model: 'proveedores',
      key: 'id'
    }
  },
  compraId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'compras',
      key: 'id'
    }
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  categoria: {
    type: DataTypes.ENUM('proveedores', 'servicios', 'salarios', 'alquiler', 'servicios_publicos', 'otro'),
    allowNull: false,
    defaultValue: 'otro'
  },
  metodoPago: {
    type: DataTypes.ENUM('efectivo', 'transferencia', 'tarjeta'),
    allowNull: false,
    defaultValue: 'efectivo'
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'gastos',
  timestamps: true,
  indexes: [
    { fields: ['negocioId'] },
    { fields: ['fecha'] },
    { fields: ['categoria'] },
    { fields: ['proveedorId'] },
    { fields: ['compraId'] }
  ]
});

module.exports = Gasto;
