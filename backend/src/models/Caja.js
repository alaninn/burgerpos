module.exports = (sequelize, DataTypes) => {
  const Caja = sequelize.define('Caja', {
    id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId:           { type: DataTypes.UUID, allowNull: false },
    usuarioId:           { type: DataTypes.UUID, allowNull: true },
    usuarioCierreId:     { type: DataTypes.UUID, allowNull: true },
    cajaDefinidaId:      { type: DataTypes.UUID, allowNull: true },
    nombre:              { type: DataTypes.STRING, allowNull: true },
    estado:              { type: DataTypes.ENUM('abierta', 'cerrada'), defaultValue: 'abierta' },
    saldoInicial:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalEfectivo:       { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalTarjeta:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalTransferencia:  { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalVentas:         { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    efectivoRetirado:    { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    dineroSiguiente:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    diferencia:          { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    notas:               { type: DataTypes.TEXT, defaultValue: '' },
    aperturaAt:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    cierreAt:            { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'cajas',
    timestamps: true
  });
  return Caja;
};
