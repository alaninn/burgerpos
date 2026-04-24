const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME     || 'burgerpos',
  process.env.DB_USER     || 'postgres',
  process.env.DB_PASSWORD || '21129021',
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

module.exports = sequelize;