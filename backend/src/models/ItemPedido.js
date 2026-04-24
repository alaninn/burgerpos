module.exports = (sequelize, DataTypes) => {
  const ItemPedido = sequelize.define('ItemPedido', {
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    pedidoId:        { type: DataTypes.UUID, allowNull: false },
    productoId:      { type: DataTypes.UUID, allowNull: true },
    nombre:          { type: DataTypes.STRING, allowNull: false },
    varianteNombre:  { type: DataTypes.STRING, allowNull: true, defaultValue: null },   // ej: "Doble"
    precioUnitario:  { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    cantidad:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    subtotal:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    adicionales:     { type: DataTypes.JSONB, defaultValue: [] },                       // [{grupoTitulo, nombre, precio, cantidad}]
    notas:           { type: DataTypes.STRING, defaultValue: '' }
  }, {
    tableName: 'items_pedido',
    timestamps: true
  });
  return ItemPedido;
};
