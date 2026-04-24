require('dotenv').config()
const sequelize = require('./src/config/sequelize')

async function migrate() {
  try {
    await sequelize.authenticate()
    console.log('✅ Conectado a la DB')

    // Verificar columna cobrado
    const [check] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'pedidos' AND column_name = 'cobrado'
    `)
    if (check.length > 0) {
      console.log('ℹ️  La columna cobrado ya existe')
    } else {
      await sequelize.query(`ALTER TABLE pedidos ADD COLUMN cobrado BOOLEAN NOT NULL DEFAULT false`)
      console.log('✅ Columna cobrado agregada')
    }

    // Marcar cobrados los pedidos digitales — columna se llama "metodoPago" con comillas en Postgres
    // Sequelize la crea con el nombre exacto del modelo, verificar nombre real
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'pedidos' AND column_name ILIKE '%pago%'
    `)
    console.log('Columnas de pago encontradas:', cols.map(c => c.column_name))

    const colName = cols[0]?.column_name
    if (colName) {
      const [updated] = await sequelize.query(`
        UPDATE pedidos 
        SET cobrado = true 
        WHERE "${colName}" NOT IN ('efectivo', 'efectivo_sin_descuento')
      `)
      console.log(`✅ Pedidos digitales marcados como cobrados`)
    }

    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

migrate()
