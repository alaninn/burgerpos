module.exports = (sequelize, DataTypes) => {
  const PagoHistorial = sequelize.define('PagoHistorial', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId:     { type: DataTypes.UUID, allowNull: false },
    dias:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    monto:         { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    metodoPago:    { type: DataTypes.STRING(50), allowNull: true },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    tipo:          { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'renovacion' }
  }, {
    tableName: 'pagos_historial',
    timestamps: true
  });
  return PagoHistorial;
};
