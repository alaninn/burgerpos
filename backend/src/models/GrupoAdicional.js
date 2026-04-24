module.exports = (sequelize, DataTypes) => {
  const GrupoAdicional = sequelize.define('GrupoAdicional', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    negocioId:     { type: DataTypes.UUID, allowNull: false },
    titulo:        { type: DataTypes.STRING, allowNull: false },
    obligatorio:   { type: DataTypes.BOOLEAN, defaultValue: false },
    minSeleccion:  { type: DataTypes.INTEGER, defaultValue: 0 },
    maxSeleccion:  { type: DataTypes.INTEGER, defaultValue: 1 },
    activo:        { type: DataTypes.BOOLEAN, defaultValue: true },
    orden:         { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'grupos_adicionales',
    timestamps: true
  });
  return GrupoAdicional;
};
