module.exports = (sequelize, DataTypes) => {
  const Pedido = sequelize.define('Pedido', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId: { type: DataTypes.UUID, allowNull: false },
    numero: { type: DataTypes.INTEGER },
    estado: {
      type: DataTypes.ENUM('nuevo', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'),
      defaultValue: 'nuevo'
    },
    modalidad: { type: DataTypes.ENUM('delivery', 'takeaway', 'salon'), allowNull: false },
    clienteId: { type: DataTypes.UUID, allowNull: true },
    clienteNombre: { type: DataTypes.STRING, defaultValue: '' },
    clienteTelefono: { type: DataTypes.STRING, defaultValue: '' },
    clienteDireccion: { type: DataTypes.STRING, defaultValue: '' },
    clienteLat: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },
    clienteLng: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },
    repartidorId: { type: DataTypes.UUID, allowNull: true },
    cajaId: { type: DataTypes.UUID, allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    costoEnvio: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    descuento: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    descuentosDetalles: { type: DataTypes.JSONB, allowNull: true, defaultValue: null, field: 'descuentos_detalles' },
    propina: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    metodoPago: {
      type: DataTypes.ENUM('efectivo', 'transferencia', 'tarjeta', 'efectivo_sin_descuento', 'mercado_pago'),
      defaultValue: 'efectivo'
    },
    notas: { type: DataTypes.TEXT, defaultValue: '' },
    cobrado: { type: DataTypes.BOOLEAN, defaultValue: false },
    transaccionMPId: { type: DataTypes.STRING, allowNull: true },
    transaccionMPEstado: { type: DataTypes.STRING, allowNull: true },
    transaccionMPData: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    tiempoEstimado: { type: DataTypes.INTEGER, defaultValue: 30 },
    // Pedido programado: el cliente eligio para que hora lo quiere (en vez de
    // "lo antes posible"). Null = pedido normal, sin programar.
    programadoPara: { type: DataTypes.DATE, allowNull: true },
    requiereFactura: { type: DataTypes.BOOLEAN, defaultValue: false },
    cuitFacturacion: { type: DataTypes.STRING, allowNull: true }
  }, {
    tableName: 'pedidos',
    timestamps: true
  });
  return Pedido;
};