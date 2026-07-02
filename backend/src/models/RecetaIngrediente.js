const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const RecetaIngrediente = sequelize.define('RecetaIngrediente', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  recetaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'recetas',
      key: 'id'
    }
  },
  ingredienteId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'productos',
      key: 'id'
    }
  },
  cantidad: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    validate: {
      min: 0.001
    }
  },
  unidad: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'receta_ingredientes',
  timestamps: true,
  indexes: [
    { fields: ['recetaId'] },
    { fields: ['ingredienteId'] }
  ]
});

module.exports = RecetaIngrediente;
