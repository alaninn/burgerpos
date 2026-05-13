/**
 * Migración: crea tabla platform_config para configuración global de plataforma
 *
 * Ejecutar con: node src/migrations/20260427_create_platform_config.js
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function migrate() {
  const qi = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('✓ Conectado a la base de datos');

    // Verificar si la tabla ya existe
    const tables = await qi.showAllTables();
    if (tables.includes('platform_config')) {
      console.log('⚠ La tabla platform_config ya existe — nada que hacer');
      process.exit(0);
    }

    // Crear tabla platform_config
    await qi.createTable('platform_config', {
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
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    console.log('✓ Tabla platform_config creada exitosamente');

    // Crear índice único en key
    await qi.addIndex('platform_config', ['key'], {
      unique: true,
      name: 'platform_config_key_unique'
    });
    console.log('✓ Índice único en key creado');

    console.log('✅ Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error en migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
