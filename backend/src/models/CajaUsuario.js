module.exports = (sequelize, DataTypes) => {
  // Operadores asociados a una caja abierta (varios pueden compartir un turno).
  const CajaUsuario = sequelize.define('CajaUsuario', {
    id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    cajaId:    { type: DataTypes.UUID, allowNull: false },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    negocioId: { type: DataTypes.UUID, allowNull: false }
  }, {
    tableName: 'caja_usuarios',
    timestamps: true
  });
  return CajaUsuario;
};
