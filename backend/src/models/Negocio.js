module.exports = (sequelize, DataTypes) => {
  const Negocio = sequelize.define('Negocio', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
    logo: { type: DataTypes.STRING, defaultValue: '' },
    telefono: { type: DataTypes.STRING, defaultValue: '' },
    direccion: { type: DataTypes.STRING, defaultValue: '' },
    ciudad: { type: DataTypes.STRING, defaultValue: '' },
    plan: { type: DataTypes.ENUM('estandar', 'premium'), defaultValue: 'estandar' },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    configuracion: { type: DataTypes.JSONB, defaultValue: {
      modalidades: { delivery: true, takeaway: true, salon: false },
      metodosPago: { efectivo: true, transferencia: true, tarjeta: false },
      horarios: [],
      montoMinimo: 0,
      costoEnvio: 0,
      aceptaPropinas: true,
      recibirPedidos: true,
      whatsapp: '',
      colorPrimario: '#7C3AED'
    }},
    vencimiento: { type: DataTypes.DATE }
  }, {
    tableName: 'negocios',
    timestamps: true
  });
  return Negocio;
};