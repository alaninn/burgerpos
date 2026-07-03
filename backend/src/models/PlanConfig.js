module.exports = (sequelize, DataTypes) => {
  const PlanConfig = sequelize.define('PlanConfig', {
    plan:    { type: DataTypes.STRING(30), primaryKey: true },
    nombre:  { type: DataTypes.STRING(50), allowNull: false },
    precio:  { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    limites: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    accesos: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    modulos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }
  }, {
    tableName: 'planes_config',
    timestamps: true
  });
  return PlanConfig;
};
