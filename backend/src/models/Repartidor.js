module.exports = (sequelize, DataTypes) => {
  const Repartidor = sequelize.define('Repartidor', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId: { type: DataTypes.UUID, allowNull: false },
    nombre: { type: DataTypes.STRING, allowNull: false },
    telefono: { type: DataTypes.STRING, defaultValue: '' },
    vehiculo: { type: DataTypes.STRING, defaultValue: '' },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'repartidores',
    timestamps: true
  });
  return Repartidor;
};