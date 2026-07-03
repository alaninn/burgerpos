module.exports = (sequelize, DataTypes) => {
  const TicketSoporte = sequelize.define('TicketSoporte', {
    id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId:       { type: DataTypes.UUID, allowNull: false },
    usuarioId:       { type: DataTypes.UUID, allowNull: true },
    asunto:          { type: DataTypes.STRING(200), allowNull: false },
    mensaje:         { type: DataTypes.TEXT, allowNull: false },
    estado:          { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'abierto' },
    respuesta:       { type: DataTypes.TEXT, allowNull: true },
    fechaResolucion: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'tickets_soporte',
    timestamps: true
  });
  return TicketSoporte;
};
