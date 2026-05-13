module.exports = (sequelize, DataTypes) => {
  const ComprobanteElectronico = sequelize.define('ComprobanteElectronico', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId: { type: DataTypes.UUID, allowNull: false },
    pedidoId: { type: DataTypes.UUID, allowNull: true }, // Puede ser null si es nota de crédito independiente

    // Datos AFIP
    cae: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    caeVencimiento: { type: DataTypes.DATE, allowNull: false },
    numeroComprobante: { type: DataTypes.INTEGER, allowNull: false },
    puntoVenta: { type: DataTypes.INTEGER, allowNull: false },

    // Tipos ARCA: 1=Factura A, 6=Factura B, 11=Factura C, 3/8/13=Notas Crédito
    tipoComprobante: { type: DataTypes.INTEGER, allowNull: false },
    letraComprobante: { type: DataTypes.STRING(1) }, // A, B, C (derivado de tipoComprobante)

    // Cliente
    tipoDocumento: { type: DataTypes.INTEGER }, // 80=CUIT, 96=DNI, 99=Sin Identificar
    numeroDocumento: { type: DataTypes.STRING(20) },
    denominacionComprador: { type: DataTypes.STRING(200) },

    // Montos
    importeTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    importeNeto: { type: DataTypes.DECIMAL(12, 2) },
    importeIVA: { type: DataTypes.DECIMAL(12, 2) },

    // Auditoría XML (crítico para debugging con AFIP)
    xmlEnviado: { type: DataTypes.TEXT },
    xmlRespuesta: { type: DataTypes.TEXT },

    estado: {
      type: DataTypes.ENUM('emitido', 'anulado', 'error'),
      defaultValue: 'emitido'
    },

    fechaEmision: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'comprobantes_electronicos',
    timestamps: true,
    indexes: [
      { fields: ['negocioId'] },
      { fields: ['pedidoId'] },
      { fields: ['cae'], unique: true },
      { fields: ['estado'] },
      { fields: ['fechaEmision'] }
    ]
  });

  return ComprobanteElectronico;
};
