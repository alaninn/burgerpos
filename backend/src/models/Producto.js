module.exports = (sequelize, DataTypes) => {
  const Producto = sequelize.define('Producto', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId:   { type: DataTypes.UUID, allowNull: false },
    categoriaId: { type: DataTypes.UUID, allowNull: true },
    descuentoId: { type: DataTypes.UUID, allowNull: true },
    nombre:         { type: DataTypes.STRING, allowNull: false },
    nombreInterno:  { type: DataTypes.STRING, defaultValue: '' },
    descripcion:    { type: DataTypes.STRING, defaultValue: '' },
    precioVenta: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    precioCosto: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    imagen:      { type: DataTypes.STRING, defaultValue: '' },
    activo:      { type: DataTypes.BOOLEAN, defaultValue: true },
    sugerido:    { type: DataTypes.BOOLEAN, defaultValue: false },
    modalidades: { type: DataTypes.JSONB, defaultValue: { delivery: true, takeaway: true, salon: true } },
    stock:       { type: DataTypes.DECIMAL(12, 3), allowNull: true },
    // Umbral de alerta de stock bajo, en la unidad base del producto
    stockMinimo: { type: DataTypes.DECIMAL(12, 3), allowNull: true },
    orden:       { type: DataTypes.INTEGER, defaultValue: 0 },
    // Campos de gestión de compras y stock
    unidadCompra:           { type: DataTypes.ENUM('caja', 'kg', 'litro', 'gramo', 'unidad'), defaultValue: 'unidad' },
    unidadContenidoCaja:    { type: DataTypes.ENUM('kg', 'litro', 'gramo', 'unidad'), allowNull: true },
    unidadBase:             { type: DataTypes.ENUM('unidad', 'kg', 'gramo', 'litro'), defaultValue: 'unidad' },
    cantidadPorUnidadCompra: { type: DataTypes.DECIMAL(10, 3), defaultValue: 1 },
    pesoUnitario:           { type: DataTypes.DECIMAL(10, 3), allowNull: true },
    ultimaCompraFecha:      { type: DataTypes.DATEONLY, allowNull: true },
    ultimoCompraPrecio:     { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    proveedorId:            { type: DataTypes.UUID, allowNull: true }
  }, {
    tableName: 'productos',
    timestamps: true
  });
  return Producto;
};