module.exports = (sequelize, DataTypes) => {
  const PlatformConfig = sequelize.define('PlatformConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'platform_config',
    timestamps: true
  });

  return PlatformConfig;
};
