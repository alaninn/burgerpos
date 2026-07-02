require('dotenv').config();
const { sequelize } = require('./src/models');

async function verify() {
  try {
    // Verificar columnas agregadas
    const [cols] = await sequelize.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE (table_name = 'categorias' AND column_name = 'tipo')
         OR (table_name = 'compras' AND column_name = 'tipoFactura')
      ORDER BY table_name, column_name;
    `);

    console.log('✅ Columnas agregadas:');
    cols.forEach(r => {
      console.log(`   ${r.table_name}.${r.column_name}: ${r.data_type} (${r.udt_name})`);
    });

    // Verificar categorías por tipo
    const [cats] = await sequelize.query(`
      SELECT COUNT(*)::int as total, tipo
      FROM categorias
      GROUP BY tipo
      ORDER BY tipo;
    `);

    console.log('\n✅ Categorías por tipo:');
    cats.forEach(r => {
      console.log(`   ${r.tipo}: ${r.total} categoría(s)`);
    });

    // Verificar categoría Ingredientes
    const [ingr] = await sequelize.query(`
      SELECT nombre, tipo, activo
      FROM categorias
      WHERE tipo = 'stock';
    `);

    console.log('\n✅ Categorías tipo stock:');
    ingr.forEach(r => {
      console.log(`   ${r.nombre} (activo: ${r.activo})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verify();
