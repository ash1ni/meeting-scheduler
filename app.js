const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('./config/database'); // Adjust the path as necessary
const { Conversation } = require('./models/Conversation'); // Adjust the path as necessary
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();
const morgan = require('morgan');

// const connectDB = require("./checkDBConnection");
// connectDB;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));

// Import routes
const chatRoutes = require('./routes/chatRoutes');

// User routes
app.use('/api', chatRoutes);

sequelize.sync().then(() => {
  console.log('Database synced');

  // Start the server inside the .then() to ensure it starts after the database is ready
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Unable to sync database:', error);
});