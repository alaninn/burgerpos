/**
 * Script para ejecutar migraciones de ARCA
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function runMigrations() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    const qi = sequelize.getQueryInterface();

    // Migración 1: arca_credentials
    console.log('📋 Migración 1/4: arca_credentials...');
    const migration1 = require('../migrations/20260503_create_arca_credentials');
    await migration1.up(qi, Sequelize);
    console.log('✅ Migración 1/4 completada\n');

    // Migración 2: comprobantes_electronicos
    console.log('📋 Migración 2/4: comprobantes_electronicos...');
    const migration2 = require('../migrations/20260503_create_comprobantes_electronicos');
    await migration2.up(qi, Sequelize);
    console.log('✅ Migración 2/4 completada\n');

    // Migración 3: tickets_acceso_wsaa
    console.log('📋 Migración 3/4: tickets_acceso_wsaa...');
    const migration3 = require('../migrations/20260503_create_tickets_acceso_wsaa');
    await migration3.up(qi, Sequelize);
    console.log('✅ Migración 3/4 completada\n');

    // Migración 4: add_comprobante_to_pedido
    console.log('📋 Migración 4/4: add comprobanteElectronicoId to pedidos...');
    const migration4 = require('../migrations/20260503_add_comprobante_to_pedido');
    await migration4.up(qi, Sequelize);
    console.log('✅ Migración 4/4 completada\n');

    console.log('🎉 TODAS LAS MIGRACIONES ARCA COMPLETADAS EXITOSAMENTE');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
