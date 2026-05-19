// Script para actualizar usuarios existentes con nuevos username y passwords
// Ejecutar: node backend/scripts/update-users-credentials.js

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

const USUARIOS_CONFIG = [
  {
    emailViejo: 'superadmin@burgerpos.com',
    username: 'superadmin',
    password: '21129021',
    rol: 'superadmin'
  },
  {
    emailViejo: 'demo@burgerpos.com',
    username: 'qrbanburger',
    password: '21129021',
    rol: 'admin'
  }
];

async function actualizarUsuarios() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

    for (const config of USUARIOS_CONFIG) {
      console.log(`📝 Actualizando usuario: ${config.username}`);

      // Hashear la nueva contraseña
      const passwordHash = await bcrypt.hash(config.password, 10);

      // Actualizar usuario por email (antes de cambiar a username)
      const [rowsUpdated] = await sequelize.query(
        `UPDATE usuarios
         SET username = :username,
             password = :password
         WHERE email = :email OR rol = :rol`,
        {
          replacements: {
            username: config.username,
            password: passwordHash,
            email: config.emailViejo,
            rol: config.rol
          }
        }
      );

      if (rowsUpdated > 0) {
        console.log(`✅ Usuario ${config.username} actualizado correctamente`);
      } else {
        console.log(`⚠️  No se encontró usuario con email ${config.emailViejo} o rol ${config.rol}`);
      }
    }

    console.log('\n✨ Proceso completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

actualizarUsuarios();
