module.exports = (sequelize, DataTypes) => {
  const Categoria = sequelize.define('Categoria', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId:   { type: DataTypes.UUID, allowNull: false },
    nombre:      { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.STRING, defaultValue: '' },
    imagen:      { type: DataTypes.STRING, defaultValue: '' },
    activo:      { type: DataTypes.BOOLEAN, defaultValue: true },
    orden:       { type: DataTypes.INTEGER, defaultValue: 0 },
    modalidades: { type: DataTypes.JSONB, defaultValue: { delivery: true, takeaway: true, salon: true } },
    tipo:        { type: DataTypes.ENUM('elaborado', 'ingrediente', 'producto'), allowNull: false, defaultValue: 'elaborado' }
  }, {
    tableName: 'categorias',
    timestamps: true
  });
  return Categoria;
};
