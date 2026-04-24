// Ejecutar: node add_descuentos_fields.js
// Agrega campos nuevos al módulo de descuentos
require('dotenv').config()
const sequelize = require('./src/config/sequelize')

async function migrate() {
  try {
    await sequelize.authenticate()
    console.log('✅ Conectado')

    const addIfMissing = async (col, sql) => {
      const [rows] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'descuentos' AND column_name = '${col}'`)
      if (rows.length === 0) {
        await sequelize.query(sql)
        console.log(`✅ Columna ${col} agregada`)
      } else {
        console.log(`ℹ️  ${col} ya existe`)
      }
    }

    await addIfMissing('categoria', `ALTER TABLE descuentos ADD COLUMN categoria VARCHAR(50) NOT NULL DEFAULT 'cupon'`)
    // categoria: 'cupon' | 'modalidad' | 'producto' | 'global' | 'metodo_pago'
    
    await addIfMissing('modalidad', `ALTER TABLE descuentos ADD COLUMN modalidad VARCHAR(20) NULL`)
    // delivery | takeaway | salon | null (todos)
    
    await addIfMissing('metodo_pago', `ALTER TABLE descuentos ADD COLUMN metodo_pago VARCHAR(50) NULL`)
    // efectivo | tarjeta | transferencia | null (todos)
    
    await addIfMissing('acumulable', `ALTER TABLE descuentos ADD COLUMN acumulable BOOLEAN NOT NULL DEFAULT true`)
    // false = no se puede combinar con otros descuentos
    
    await addIfMissing('uso_unico_cliente', `ALTER TABLE descuentos ADD COLUMN uso_unico_cliente BOOLEAN NOT NULL DEFAULT false`)
    // true = un solo uso por cliente
    
    await addIfMissing('aplica_automatico', `ALTER TABLE descuentos ADD COLUMN aplica_automatico BOOLEAN NOT NULL DEFAULT false`)
    // true = se aplica sin necesidad de código (descuentos por modalidad/método)

    console.log('\n✅ Migración completada')
    process.exit(0)
  } catch (err) {
    console.error('❌', err.message)
    process.exit(1)
  }
}
migrate()
