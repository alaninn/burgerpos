module.exports = (sequelize, DataTypes) => {
  const Cliente = sequelize.define('Cliente', {
    id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId: { type: DataTypes.UUID, allowNull: false },
    nombre:    { type: DataTypes.STRING, allowNull: false },
    telefono:  { type: DataTypes.STRING, defaultValue: '' },
    email:     { type: DataTypes.STRING, defaultValue: '' },
    direccion:   { type: DataTypes.STRING, defaultValue: '' },
    direcciones: { type: DataTypes.JSONB, defaultValue: [] },  // array de strings
    notas:       { type: DataTypes.TEXT,  defaultValue: '' },
    activo:       { type: DataTypes.BOOLEAN, defaultValue: true },
    numeroCliente:  { type: DataTypes.INTEGER, field: 'numero_cliente', allowNull: true },
    descuentoFijo:  { type: DataTypes.DECIMAL(5,2), field: 'descuento_fijo', defaultValue: 0 }
  }, {
    tableName: 'clientes',
    timestamps: true
  });
  return Cliente;
};