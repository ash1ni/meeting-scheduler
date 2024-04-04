const { sequelize } = require('./config/database.js');

sequelize
  .authenticate()
  .then(() => {
    console.log('PostgreSQL connected');
  })
  .catch((error) => {
    console.error('Error connecting to PostgreSQL:', error);
  });
