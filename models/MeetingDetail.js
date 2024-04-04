const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class MeetingDetails extends Model {}

MeetingDetails.init({
  email: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  baRule: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  chairperson: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  sequelize,
  modelName: 'MeetingDetails',
  timestamps: true,
});

module.exports = MeetingDetails;