module.exports = (sequelize, DataTypes) => {
  const TicketAccesoWSAA = sequelize.define('TicketAccesoWSAA', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId: { type: DataTypes.UUID, allowNull: false },
    servicio: { type: DataTypes.STRING(50), defaultValue: 'wsfe' },

    token: { type: DataTypes.TEXT, allowNull: false },
    sign: { type: DataTypes.TEXT, allowNull: false },
    expiracion: { type: DataTypes.DATE, allowNull: false } // Tickets válidos ~10 min
  }, {
    tableName: 'tickets_acceso_wsaa',
    timestamps: true,
    indexes: [
      { fields: ['negocioId', 'servicio'] },
      { fields: ['expiracion'] }
    ]
  });

  return TicketAccesoWSAA;
};
