/**
 * Migración: crea tabla mercadopago_credentials para tokens OAuth
 *
 * Ejecutar con: node src/migrations/20260427_create_mercadopago_credentials.js
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
    if (tables.includes('mercadopago_credentials')) {
      console.log('⚠ La tabla mercadopago_credentials ya existe — nada que hacer');
      process.exit(0);
    }

    // Buscar la tabla de negocios
    const negociosTable = tables.find(t => t.toLowerCase() === 'negocios');
    if (!negociosTable) {
      console.error('✗ No se encontró la tabla negocios');
      process.exit(1);
    }
    console.log(`✓ Usando tabla: "${negociosTable}"`);

    // Crear tabla mercadopago_credentials
    await qi.createTable('mercadopago_credentials', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      negocioId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: negociosTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      publicKey: {
        type: DataTypes.STRING,
        allowNull: true
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      entornoProduccion: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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

    console.log('✓ Tabla mercadopago_credentials creada exitosamente');

    // Crear índices
    await qi.addIndex('mercadopago_credentials', ['negocioId'], {
      unique: true,
      name: 'mp_credentials_negocio_unique'
    });
    console.log('✓ Índice único en negocioId creado');

    await qi.addIndex('mercadopago_credentials', ['activo'], {
      name: 'mp_credentials_activo_idx'
    });
    console.log('✓ Índice en activo creado');

    await qi.addIndex('mercadopago_credentials', ['expiresAt'], {
      name: 'mp_credentials_expires_idx'
    });
    console.log('✓ Índice en expiresAt creado');

    console.log('✅ Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error en migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
