// Script para actualizar solo las contraseñas de usuarios existentes
// Ejecutar: node backend/scripts/update-passwords-only.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

const USUARIOS = [
  { username: 'superadmin', password: '21129021' },
  { username: 'qrbanburger', password: '21129021' }
];

async function actualizarPasswords() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

    for (const user of USUARIOS) {
      console.log(`📝 Actualizando password para: ${user.username}`);

      const passwordHash = await bcrypt.hash(user.password, 10);

      const [rowsUpdated] = await sequelize.query(
        `UPDATE usuarios SET password = :password WHERE username = :username`,
        {
          replacements: {
            username: user.username,
            password: passwordHash
          }
        }
      );

      if (rowsUpdated > 0) {
        console.log(`✅ Password actualizada para ${user.username}`);
      } else {
        console.log(`⚠️  No se encontró usuario: ${user.username}`);
      }
    }

    console.log('\n✨ Contraseñas actualizadas correctamente');
    console.log('🔑 Nuevas credenciales:');
    console.log('   • superadmin / 21129021');
    console.log('   • qrbanburger / 21129021');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

actualizarPasswords();
