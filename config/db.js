const mysql = require('mysql2');

// Create a connection pool instead of a single connection
const pool = mysql.createPool({
  host: 'localhost',  // Change if necessary
  user: 'root',       // Change with your MySQL username
  password: '',       // Change with your MySQL password
  database: 'disastermanagement',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  idleTimeout: 300000,
  maxIdle: 10
});

// Test the connection pool
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to MySQL database with connection pool');
  console.log('kabir');
  connection.release(); // Release the connection back to the pool
});

module.exports = pool;
