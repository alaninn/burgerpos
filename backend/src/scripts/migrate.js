/**
 * Script de migración manual — agrega columnas faltantes sin borrar datos
 * Uso: node src/scripts/migrate.js
 */
const sequelize = require('../config/sequelize');

const migrations = [
  // items_pedido: columnas para variantes/adicionales
  `ALTER TABLE items_pedido ADD COLUMN IF NOT EXISTS "varianteNombre" VARCHAR(255) DEFAULT NULL`,
  `ALTER TABLE items_pedido ADD COLUMN IF NOT EXISTS "adicionales" JSONB DEFAULT '[]'`,
  `ALTER TABLE items_pedido ADD COLUMN IF NOT EXISTS "notas" VARCHAR(255) DEFAULT ''`,
  // clientes: array de direcciones guardadas
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "direcciones" JSONB DEFAULT '[]'`,
  // clientes: numero_cliente y descuento_fijo
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "numero_cliente" INTEGER DEFAULT NULL`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "descuento_fijo" DECIMAL(5,2) DEFAULT 0`,
  // adicionales: selección máxima por ítem
  `ALTER TABLE adicionales ADD COLUMN IF NOT EXISTS "maxSeleccion" INTEGER DEFAULT 1`,
  // pedidos: campos de facturación y cobro
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS "cobrado" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS "requiereFactura" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS "cuitFacturacion" VARCHAR(20) DEFAULT NULL`,
  // productos: producto sugerido (aparece como destacado en el menú online)
  `ALTER TABLE productos ADD COLUMN IF NOT EXISTS "sugerido" BOOLEAN DEFAULT FALSE`,
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    for (const sql of migrations) {
      try {
        await sequelize.query(sql);
        const col = sql.match(/"(\w+)"/)?.[1] || sql;
        console.log(`✅ ${col} — ok`);
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
      }
    }

    console.log('\n✅ Migración completada. Reiniciá el servidor backend.');
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  } finally {
    await sequelize.close();
  }
}

run();
