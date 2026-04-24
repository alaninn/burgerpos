module.exports = (sequelize, DataTypes) => {
  const Producto = sequelize.define('Producto', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId:   { type: DataTypes.UUID, allowNull: false },
    categoriaId: { type: DataTypes.UUID, allowNull: true },
    nombre:         { type: DataTypes.STRING, allowNull: false },
    nombreInterno:  { type: DataTypes.STRING, defaultValue: '' },
    descripcion:    { type: DataTypes.STRING, defaultValue: '' },
    precioVenta: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    precioCosto: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    imagen:      { type: DataTypes.STRING, defaultValue: '' },
    activo:      { type: DataTypes.BOOLEAN, defaultValue: true },
    sugerido:    { type: DataTypes.BOOLEAN, defaultValue: false },
    modalidades: { type: DataTypes.JSONB, defaultValue: { delivery: true, takeaway: true, salon: true } },
    stock:       { type: DataTypes.INTEGER, allowNull: true },
    orden:       { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'productos',
    timestamps: true
  });
  return Producto;
};