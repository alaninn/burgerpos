const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Gasto = sequelize.define('Gasto', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  negocioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'negocios',
      key: 'id'
    }
  },
  proveedorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'proveedores',
      key: 'id'
    }
  },
  compraId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'compras',
      key: 'id'
    }
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  categoria: {
    type: DataTypes.ENUM('proveedores', 'servicios', 'salarios', 'alquiler', 'servicios_publicos', 'otro'),
    allowNull: false,
    defaultValue: 'otro'
  },
  metodoPago: {
    type: DataTypes.ENUM('efectivo', 'transferencia', 'tarjeta', 'mercadopago'),
    allowNull: false,
    defaultValue: 'efectivo'
  },
  // Tipo de movimiento: gasto comun / pago a proveedor / compra
  tipo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'variable'
  },
  // De donde sale el dinero: 'caja' descuenta del cierre del turno; 'local'/'otro' no
  origenDinero: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'local'
  },
  cajaId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  // Dato fiscal: null = Gasto X (sin comprobante) · 'factura_a' = en blanco (IVA credito)
  tipoComprobante: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  // 'a_cuenta' | 'pago_deuda' | 'cobro_deuda'
  tipoPagoProveedor: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  reciboUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  numeroBoleta: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ivaIncluido: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  porcentajeIva: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  montoIva: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalFactura: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'gastos',
  timestamps: true,
  indexes: [
    { fields: ['negocioId'] },
    { fields: ['fecha'] },
    { fields: ['categoria'] },
    { fields: ['proveedorId'] },
    { fields: ['compraId'] }
  ]
});

module.exports = Gasto;
