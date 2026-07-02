'use strict';

// Alinea la tabla usuarios con el esquema de produccion: username (login),
// telefono, y email opcional. Idempotente: en bases que ya tienen las
// columnas (produccion) no cambia nada.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "username" VARCHAR(255);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "telefono" VARCHAR(255);
    `);
    // Backfill: usuarios sin username usan su email como username (email es unico)
    await queryInterface.sequelize.query(`
      UPDATE usuarios SET "username" = LOWER("email") WHERE "username" IS NULL AND "email" IS NOT NULL;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE usuarios ALTER COLUMN "username" SET NOT NULL;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_unique ON usuarios ("username");
    `);
    // El email pasa a ser opcional (el login principal es por username)
    await queryInterface.sequelize.query(`
      ALTER TABLE usuarios ALTER COLUMN "email" DROP NOT NULL;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS usuarios_username_unique;`);
    await queryInterface.sequelize.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS "username";`);
    await queryInterface.sequelize.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS "telefono";`);
  }
};
