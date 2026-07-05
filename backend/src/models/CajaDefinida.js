module.exports = (sequelize, DataTypes) => {
  // Caja fija del local (Mañana, Tarde, Trasnoche...). Cualquier operador la
  // abre por su nombre; el admin las administra desde Control de Cajas.
  const CajaDefinida = sequelize.define('CajaDefinida', {
    id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId: { type: DataTypes.UUID, allowNull: false },
    nombre:    { type: DataTypes.STRING, allowNull: false },
    orden:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    activa:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: 'cajas_definidas',
    timestamps: true
  });
  return CajaDefinida;
};
