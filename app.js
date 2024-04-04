const express = require('express');
const bodyParser = require('body-parser');
// const { sequelize, Sequelize } = require('./models');
const app = express();
const port = process.env.PORT || 5000;
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});