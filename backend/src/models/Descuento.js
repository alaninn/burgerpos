module.exports = (sequelize, DataTypes) => {
  const Descuento = sequelize.define('Descuento', {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId:        { type: DataTypes.UUID, allowNull: false },
    codigo:           { type: DataTypes.STRING, allowNull: false },
    tipo:             { type: DataTypes.ENUM('porcentaje', 'fijo'), defaultValue: 'porcentaje' },
    valor:            { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    activo:           { type: DataTypes.BOOLEAN, defaultValue: true },
    usosMax:          { type: DataTypes.INTEGER, allowNull: true },
    usosActuales:     { type: DataTypes.INTEGER, defaultValue: 0 },
    fechaVencimiento: { type: DataTypes.DATEONLY, allowNull: true },
    minimoCompra:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    descripcion:      { type: DataTypes.STRING, defaultValue: '' },
    categoria:        { type: DataTypes.STRING, defaultValue: 'cupon' },
    // 'cupon' | 'modalidad' | 'producto' | 'global' | 'metodo_pago'
    modalidad:        { type: DataTypes.STRING, allowNull: true },
    metodoPagoDesc:   { type: DataTypes.STRING, field: 'metodo_pago', allowNull: true },
    acumulable:       { type: DataTypes.BOOLEAN, defaultValue: true },
    usoUnicoCliente:  { type: DataTypes.BOOLEAN, field: 'uso_unico_cliente', defaultValue: false },
    aplicaAutomatico: { type: DataTypes.BOOLEAN, field: 'aplica_automatico', defaultValue: false }
  }, {
    tableName: 'descuentos',
    timestamps: true
  });
  return Descuento;
};
