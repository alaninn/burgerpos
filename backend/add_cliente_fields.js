require('dotenv').config()
const sequelize = require('./src/config/sequelize')

async function migrate() {
  try {
    await sequelize.authenticate()
    console.log('✅ Conectado')

    const addIfMissing = async (table, col, sql) => {
      const [rows] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = '${col}'`)
      if (rows.length === 0) {
        await sequelize.query(sql)
        console.log(`✅ ${table}.${col} agregada`)
      } else {
        console.log(`ℹ️  ${table}.${col} ya existe`)
      }
    }

    // numero_cliente: auto-incremental por negocio
    await addIfMissing('clientes', 'numero_cliente', 
      `ALTER TABLE clientes ADD COLUMN numero_cliente INTEGER`)
    
    // descuento_fijo: descuento personalizado para ese cliente
    await addIfMissing('clientes', 'descuento_fijo',
      `ALTER TABLE clientes ADD COLUMN descuento_fijo DECIMAL(5,2) DEFAULT 0`)

    // Asignar numeros a clientes existentes por negocio
    const [negocios] = await sequelize.query(
      `SELECT DISTINCT negocio_id FROM clientes WHERE numero_cliente IS NULL`
    )
    
    for (const neg of negocios) {
      await sequelize.query(`
        UPDATE clientes SET numero_cliente = sub.rn
        FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY negocio_id ORDER BY "createdAt") as rn
          FROM clientes WHERE negocio_id = '${neg.negocio_id}'
        ) sub
        WHERE clientes.id = sub.id
      `)
    }
    console.log(`✅ Números de cliente asignados`)

    console.log('\n✅ Migración completada')
    process.exit(0)
  } catch (err) {
    console.error('❌', err.message)
    process.exit(1)
  }
}
migrate()
