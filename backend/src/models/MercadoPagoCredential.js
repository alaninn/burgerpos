module.exports = (sequelize, DataTypes) => {
  const MercadoPagoCredential = sequelize.define('MercadoPagoCredential', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    negocioId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    publicKey: {
      type: DataTypes.STRING
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    userId: {
      type: DataTypes.STRING
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    entornoProduccion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'mercadopago_credentials',
    timestamps: true,
    indexes: [
      { fields: ['negocioId'], unique: true },
      { fields: ['activo'] },
      { fields: ['expiresAt'] }
    ]
  });

  return MercadoPagoCredential;
};
