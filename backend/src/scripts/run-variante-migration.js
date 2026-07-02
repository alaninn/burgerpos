/**
 * Script para ejecutar la migración de varianteId en recetas
 */
const sequelize = require('../config/sequelize');
const migration = require('../migrations/20260608_add_variante_to_recetas');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    const queryInterface = sequelize.getQueryInterface();
    const Sequelize = require('sequelize');

    console.log('📦 Ejecutando migración: add_variante_to_recetas...');
    await migration.up(queryInterface, Sequelize);

    console.log('✅ Migración completada exitosamente');
  } catch (err) {
    console.error('❌ Error en la migración:', err.message);
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

run();
