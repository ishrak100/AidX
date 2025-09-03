const mysql = require('mysql2');

// Create a connection to the database
const db = mysql.createConnection({
  host: 'localhost',  // Change if necessary
  user: 'root',       // Change with your MySQL username
  password: '',       // Change with your MySQL password
  database: 'disastermanagement'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to MySQL database');
  console.log('Database connection successful for AidX');
});

module.exports = db;
