const { Sequelize } = require('sequelize');
require('dotenv').config();
const config = require('./config/config');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: config.dialect,
  logging: false,
});

module.exports = {
  sequelize,
};
