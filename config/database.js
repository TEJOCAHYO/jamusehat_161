require('dotenv').config();
const { Sequelize } = require('sequelize');

const dialect = process.env.DB_DIALECT || 'postgres';

const sequelize = dialect === 'sqlite'
  ? new Sequelize({ dialect: 'sqlite', storage: process.env.DB_STORAGE || 'jamuku.sqlite', logging: false })
  : new Sequelize(
      process.env.DB_NAME || 'jamuku_db',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '',
      { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 5432, dialect: 'postgres', logging: false }
    );

module.exports = sequelize;
