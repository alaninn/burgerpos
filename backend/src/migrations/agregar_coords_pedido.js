/**
 * Migración: agrega clienteLat y clienteLng a la tabla Pedidos
 * 
 * Ejecutar con:  node migrations/agregar_coords_pedido.js
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

    // Detectar nombre exacto de la tabla (puede ser "Pedidos" o "pedidos")
    const tables = await qi.showAllTables()
    console.log('Tablas encontradas:', tables)
    const tableName = tables.find(t => t.toLowerCase() === 'pedidos')
    if (!tableName) {
      console.error('✗ No se encontró tabla pedidos. Tablas disponibles:', tables)
      process.exit(1)
    }
    console.log(`✓ Usando tabla: "${tableName}"`)

    const tableDesc = await qi.describeTable(tableName)

    if (tableDesc.clienteLat) {
      console.log('⚠ Las columnas ya existen — nada que hacer')
      process.exit(0)
    }

    await qi.addColumn(tableName, 'clienteLat', {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    })

    await qi.addColumn(tableName, 'clienteLng', {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    })

    console.log(`✓ Columnas clienteLat y clienteLng agregadas a "${tableName}"`)
    process.exit(0)
  } catch (err) {
    console.error('✗ Error en migración:', err.message)
    process.exit(1)
  }
}

migrate()
