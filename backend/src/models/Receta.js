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
  // Extra de costo (monto fijo en $) que se suma al costo de los ingredientes:
  // cubre merma, salsas caseras, condimentos menores y desperdicio no medidos.
  extraCosto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // "Receta especial": si tiene valor, esta receta combina ingredientes para
  // producir esta cantidad (en la unidad base del producto resultante, ej.
  // 500 gramos de una salsa) en vez de "1 unidad" como una receta de menu.
  cantidadProducida: {
    type: DataTypes.DECIMAL(12, 3),
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
