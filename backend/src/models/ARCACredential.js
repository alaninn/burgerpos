module.exports = (sequelize, DataTypes) => {
  const ARCACredential = sequelize.define('ARCACredential', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId: { type: DataTypes.UUID, allowNull: false, unique: true },

    // Rutas encriptadas de certificados
    certPath: { type: DataTypes.TEXT }, // encryptionService.encrypt('certificados/cert_CUIT_timestamp.crt')
    keyPath: { type: DataTypes.TEXT },  // encryptionService.encrypt('certificados/key_CUIT_timestamp.key')
    csrPath: { type: DataTypes.TEXT },  // encryptionService.encrypt('certificados/csr_CUIT_timestamp.csr')

    cuit: { type: DataTypes.STRING(15), allowNull: false },
    razonSocial: { type: DataTypes.STRING(200) },
    puntoVenta: { type: DataTypes.INTEGER, defaultValue: 1 },

    regimenFiscal: {
      type: DataTypes.ENUM('responsable_inscripto', 'monotributista'),
      allowNull: false
    },

    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    entornoProduccion: { type: DataTypes.BOOLEAN, defaultValue: false },
    fechaVencimiento: { type: DataTypes.DATE },

    // Metadatos fiscales
    condicionIVA: { type: DataTypes.STRING(100) },
    ingresosBrutos: { type: DataTypes.STRING(50) },
    inicioActividades: { type: DataTypes.DATE }
  }, {
    tableName: 'arca_credentials',
    timestamps: true,
    indexes: [
      { fields: ['negocioId'], unique: true },
      { fields: ['activo'] },
      { fields: ['cuit'] }
    ]
  });

  return ARCACredential;
};
