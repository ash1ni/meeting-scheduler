const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Conversation extends Model {}

Conversation.init({
  messages: DataTypes.TEXT,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, {
  sequelize,
  modelName: 'Conversation',
  tableName: 'Conversations',
});

module.exports = Conversation;