module.exports = (sequelize, DataTypes) => {
  const Alerta = sequelize.define('Alerta', {
    id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tipo:        { type: DataTypes.STRING(50), allowNull: false },
    titulo:      { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    severidad:   { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'media' },
    negocioId:   { type: DataTypes.UUID, allowNull: true },
    resuelta:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    tableName: 'alertas',
    timestamps: true
  });
  return Alerta;
};
