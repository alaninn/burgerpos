module.exports = (sequelize, DataTypes) => {
  const ErrorFrontend = sequelize.define('ErrorFrontend', {
    id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId: { type: DataTypes.UUID, allowNull: true },
    usuarioId: { type: DataTypes.UUID, allowNull: true },
    mensaje:   { type: DataTypes.TEXT, allowNull: false },
    stack:     { type: DataTypes.TEXT, allowNull: true },
    url:       { type: DataTypes.STRING(500), allowNull: true },
    userAgent: { type: DataTypes.STRING(300), allowNull: true }
  }, {
    tableName: 'errores_frontend',
    timestamps: true
  });
  return ErrorFrontend;
};
