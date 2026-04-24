module.exports = (sequelize, DataTypes) => {
  const Adicional = sequelize.define('Adicional', {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    grupoAdicionalId: { type: DataTypes.UUID, allowNull: false },
    negocioId:        { type: DataTypes.UUID, allowNull: false },
    nombre:           { type: DataTypes.STRING, allowNull: false },
    precioVenta:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    precioCosto:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    maxSeleccion:     { type: DataTypes.INTEGER, defaultValue: 1 },
    visible:          { type: DataTypes.BOOLEAN, defaultValue: true },
    stock:            { type: DataTypes.INTEGER, allowNull: true },
    activo:           { type: DataTypes.BOOLEAN, defaultValue: true },
    orden:            { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'adicionales',
    timestamps: true
  });
  return Adicional;
};
