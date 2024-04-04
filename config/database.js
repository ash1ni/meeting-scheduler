const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres:root123@3.109.59.175:5432/meetingDB');

module.exports = sequelize;