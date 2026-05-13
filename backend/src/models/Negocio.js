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
      colorPrimario: '#7C3AED',
      mapaConfiguracion: {
        tema: 'standard',
        colorPinPagado: '#22c55e',
        colorPinPendiente: '#ef4444',
        colorFondo: '#f5f5f5',
        colorHeader: '#ffffff',
        colorTexto: '#1f2937',
        colorTextoSecundario: '#6b7280',
        colorNegocio: '#1f2937',
        tamanioPins: 'mediano',
        opacidadMapa: 1,
        tileLayer: 'standard',
        brillo: 0,
        contraste: 0,
        saturacion: 0,
        matiz: 0
      }
    }},
    vencimiento: { type: DataTypes.DATE }
  }, {
    tableName: 'negocios',
    timestamps: true
  });
  return Negocio;
};