module.exports = (sequelize, DataTypes) => {
  const ProductoVariante = sequelize.define('ProductoVariante', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    productoId:   { type: DataTypes.UUID, allowNull: false },
    negocioId:    { type: DataTypes.UUID, allowNull: false },
    nombre:       { type: DataTypes.STRING, allowNull: false },         // "Simple", "Doble", "Triple"
    precioVenta:  { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    precioCosto:  { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    visible:      { type: DataTypes.BOOLEAN, defaultValue: true },
    stock:        { type: DataTypes.INTEGER, allowNull: true },
    activo:       { type: DataTypes.BOOLEAN, defaultValue: true },
    orden:        { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'producto_variantes',
    timestamps: true
  });
  return ProductoVariante;
};
