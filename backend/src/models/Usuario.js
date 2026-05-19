module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define('Usuario', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    rol: { type: DataTypes.ENUM('superadmin', 'admin', 'operador'), defaultValue: 'admin' },
    negocioId: { type: DataTypes.UUID, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    ultimoAcceso: { type: DataTypes.DATE }
  }, {
    tableName: 'usuarios',
    timestamps: true
  });
  return Usuario;
};