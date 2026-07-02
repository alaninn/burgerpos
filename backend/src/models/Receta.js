const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Receta = sequelize.define('Receta', {
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
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  productoMenuId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'productos',
      key: 'id'
    }
  },
  varianteId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'producto_variantes',
      key: 'id'
    }
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'recetas',
  timestamps: true,
  indexes: [
    { fields: ['negocioId'] },
    { fields: ['productoMenuId'] },
    { fields: ['activo'] }
  ]
});

module.exports = Receta;
