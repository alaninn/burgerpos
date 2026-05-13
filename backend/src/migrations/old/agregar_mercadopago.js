/**
 * Migración: agrega campos de MercadoPago a la tabla Pedidos
 *
 * Ejecutar con:  node src/migrations/agregar_mercadopago.js
 * Desde:         backend/
 */

require('dotenv').config()
const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
)

async function migrate() {
  const qi = sequelize.getQueryInterface()

  try {
    await sequelize.authenticate()
    console.log('✓ Conectado a la base de datos')

    // Detectar nombre exacto de la tabla
    const tables = await qi.showAllTables()
    const tableName = tables.find(t => t.toLowerCase() === 'pedidos')
    if (!tableName) {
      console.error('✗ No se encontró tabla pedidos. Tablas disponibles:', tables)
      process.exit(1)
    }
    console.log(`✓ Usando tabla: "${tableName}"`)

    const tableDesc = await qi.describeTable(tableName)

    // Verificar si ya existe
    if (tableDesc.transaccionMPId) {
      console.log('⚠ Los campos de MercadoPago ya existen — nada que hacer')
      process.exit(0)
    }

    // Agregar columna transaccionMPId
    await qi.addColumn(tableName, 'transaccionMPId', {
      type: DataTypes.STRING,
      allowNull: true,
    })
    console.log('✓ Columna transaccionMPId agregada')

    // Agregar columna transaccionMPEstado
    await qi.addColumn(tableName, 'transaccionMPEstado', {
      type: DataTypes.STRING,
      allowNull: true,
    })
    console.log('✓ Columna transaccionMPEstado agregada')

    // Agregar columna transaccionMPData (JSONB)
    await qi.addColumn(tableName, 'transaccionMPData', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    })
    console.log('✓ Columna transaccionMPData agregada')

    // Agregar 'mercado_pago' al ENUM de metodoPago si no existe
    console.log('✓ Verificando ENUM de metodoPago...')
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'mercado_pago'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_${tableName}_metodoPago')
          ) THEN
            ALTER TYPE "enum_${tableName}_metodoPago" ADD VALUE 'mercado_pago';
          END IF;
        END $$;
      `)
      console.log('✓ Valor "mercado_pago" agregado al ENUM metodoPago')
    } catch (err) {
      console.log('⚠ No se pudo agregar al ENUM (puede que ya exista):', err.message)
    }

    console.log('✓ Migración completada exitosamente')
    process.exit(0)
  } catch (err) {
    console.error('✗ Error en migración:', err.message)
    console.error(err)
    process.exit(1)
  }
}

migrate()
