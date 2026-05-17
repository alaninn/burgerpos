const sequelize = require('../config/sequelize');
const { DataTypes } = require('sequelize');

const Usuario        = require('./Usuario')(sequelize, DataTypes);
const Negocio        = require('./Negocio')(sequelize, DataTypes);
const Categoria      = require('./Categoria')(sequelize, DataTypes);
const Producto       = require('./Producto')(sequelize, DataTypes);
const ProductoVariante = require('./ProductoVariante')(sequelize, DataTypes);
const GrupoAdicional = require('./GrupoAdicional')(sequelize, DataTypes);
const Adicional      = require('./Adicional')(sequelize, DataTypes);
const Cliente        = require('./Cliente')(sequelize, DataTypes);
const Repartidor     = require('./Repartidor')(sequelize, DataTypes);
const Pedido         = require('./Pedido')(sequelize, DataTypes);
const ItemPedido     = require('./ItemPedido')(sequelize, DataTypes);
const Caja           = require('./Caja')(sequelize, DataTypes);
const Descuento      = require('./Descuento')(sequelize, DataTypes);
const PlatformConfig = require('./PlatformConfig')(sequelize, DataTypes);
const MercadoPagoCredential = require('./MercadoPagoCredential')(sequelize, DataTypes);
const ARCACredential = require('./ARCACredential')(sequelize, DataTypes);
const ComprobanteElectronico = require('./ComprobanteElectronico')(sequelize, DataTypes);
const TicketAccesoWSAA = require('./TicketAccesoWSAA')(sequelize, DataTypes);
const WhatsAppConfig = require('./WhatsAppConfig')(sequelize, DataTypes);

// ── Negocio → Usuario ─────────────────────────────────────
Negocio.hasMany(Usuario,      { foreignKey: 'negocioId', as: 'usuarios' });
Usuario.belongsTo(Negocio,    { foreignKey: 'negocioId', as: 'negocio' });

// ── Negocio → Categoria ───────────────────────────────────
Negocio.hasMany(Categoria,    { foreignKey: 'negocioId', as: 'categorias' });
Categoria.belongsTo(Negocio,  { foreignKey: 'negocioId', as: 'negocio' });

// ── Negocio → Producto ────────────────────────────────────
Negocio.hasMany(Producto,     { foreignKey: 'negocioId', as: 'productos' });
Producto.belongsTo(Negocio,   { foreignKey: 'negocioId', as: 'negocio' });

Categoria.hasMany(Producto,   { foreignKey: 'categoriaId', as: 'productos' });
Producto.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });

// ── Producto → Descuento (opcional) ───────────────────────
Producto.belongsTo(Descuento, { foreignKey: 'descuentoId', as: 'descuento' });
Descuento.hasMany(Producto, { foreignKey: 'descuentoId', as: 'productos' });

// ── Producto → Variantes ──────────────────────────────────
Producto.hasMany(ProductoVariante,      { foreignKey: 'productoId', as: 'variantes', onDelete: 'CASCADE' });
ProductoVariante.belongsTo(Producto,    { foreignKey: 'productoId', as: 'producto' });

// ── Negocio → GrupoAdicional ──────────────────────────────
Negocio.hasMany(GrupoAdicional,         { foreignKey: 'negocioId', as: 'gruposAdicionales' });
GrupoAdicional.belongsTo(Negocio,       { foreignKey: 'negocioId', as: 'negocio' });

// ── GrupoAdicional → Adicional ────────────────────────────
GrupoAdicional.hasMany(Adicional,       { foreignKey: 'grupoAdicionalId', as: 'items', onDelete: 'CASCADE' });
Adicional.belongsTo(GrupoAdicional,     { foreignKey: 'grupoAdicionalId', as: 'grupo' });

// ── Producto ↔ GrupoAdicional (many-to-many) ──────────────
Producto.belongsToMany(GrupoAdicional, {
  through: 'producto_grupos_adicionales',
  as: 'gruposAdicionales',
  foreignKey: 'productoId',
  otherKey: 'grupoAdicionalId'
});
GrupoAdicional.belongsToMany(Producto, {
  through: 'producto_grupos_adicionales',
  as: 'productos',
  foreignKey: 'grupoAdicionalId',
  otherKey: 'productoId'
});

// ── Negocio → Cliente ─────────────────────────────────────
Negocio.hasMany(Cliente,      { foreignKey: 'negocioId', as: 'clientes' });
Cliente.belongsTo(Negocio,    { foreignKey: 'negocioId', as: 'negocio' });

// ── Negocio → Repartidor ──────────────────────────────────
Negocio.hasMany(Repartidor,   { foreignKey: 'negocioId', as: 'repartidores' });
Repartidor.belongsTo(Negocio, { foreignKey: 'negocioId', as: 'negocio' });

// ── Negocio → Pedido ──────────────────────────────────────
Negocio.hasMany(Pedido,       { foreignKey: 'negocioId', as: 'pedidos' });
Pedido.belongsTo(Negocio,     { foreignKey: 'negocioId', as: 'negocio' });

Pedido.hasMany(ItemPedido,    { foreignKey: 'pedidoId', as: 'items' });
ItemPedido.belongsTo(Pedido,  { foreignKey: 'pedidoId', as: 'pedido' });

ItemPedido.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });

Pedido.belongsTo(Cliente,     { foreignKey: 'clienteId', as: 'cliente' });
Cliente.hasMany(Pedido,       { foreignKey: 'clienteId', as: 'pedidos' });

Pedido.belongsTo(Repartidor,  { foreignKey: 'repartidorId', as: 'repartidor' });
Repartidor.hasMany(Pedido,    { foreignKey: 'repartidorId', as: 'pedidos' });

// ── Negocio → Caja ────────────────────────────────────────
Negocio.hasMany(Caja,         { foreignKey: 'negocioId', as: 'cajas' });
Caja.belongsTo(Negocio,       { foreignKey: 'negocioId', as: 'negocio' });
Caja.belongsTo(Usuario,       { foreignKey: 'usuarioId', as: 'usuario' });

// ── Negocio → Descuento ───────────────────────────────────
Negocio.hasMany(Descuento,    { foreignKey: 'negocioId', as: 'descuentos' });
Descuento.belongsTo(Negocio,  { foreignKey: 'negocioId', as: 'negocio' });

// ── Negocio → MercadoPago OAuth ───────────────────────────
Negocio.hasOne(MercadoPagoCredential, { foreignKey: 'negocioId', as: 'mercadoPagoCredential' });
MercadoPagoCredential.belongsTo(Negocio, { foreignKey: 'negocioId', as: 'negocio' });

// ── Negocio → ARCA Facturación ────────────────────────────
Negocio.hasOne(ARCACredential, { foreignKey: 'negocioId', as: 'arcaCredential' });
ARCACredential.belongsTo(Negocio, { foreignKey: 'negocioId', as: 'negocio' });

Negocio.hasMany(ComprobanteElectronico, { foreignKey: 'negocioId', as: 'comprobantes' });
ComprobanteElectronico.belongsTo(Negocio, { foreignKey: 'negocioId', as: 'negocio' });

Pedido.hasOne(ComprobanteElectronico, { foreignKey: 'pedidoId', as: 'comprobante' });
ComprobanteElectronico.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });

Negocio.hasMany(TicketAccesoWSAA, { foreignKey: 'negocioId', as: 'ticketsWSAA' });
TicketAccesoWSAA.belongsTo(Negocio, { foreignKey: 'negocioId', as: 'negocio' });

// ── Negocio → WhatsAppConfig ──────────────────────────────
Negocio.hasOne(WhatsAppConfig, { foreignKey: 'negocioId', as: 'whatsappConfig' });
WhatsAppConfig.belongsTo(Negocio, { foreignKey: 'negocioId', as: 'negocio' });

// ── Exportar ──────────────────────────────────────────────
module.exports = {
  sequelize,
  Usuario,
  Negocio,
  Categoria,
  Producto,
  ProductoVariante,
  GrupoAdicional,
  Adicional,
  Cliente,
  Repartidor,
  Pedido,
  ItemPedido,
  Caja,
  Descuento,
  PlatformConfig,
  MercadoPagoCredential,
  ARCACredential,
  ComprobanteElectronico,
  TicketAccesoWSAA,
  WhatsAppConfig
};
