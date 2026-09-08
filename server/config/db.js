// Centralized MySQL connection pool.
// A "pool" keeps several connections open and ready, so every controller
// can just `require` this file and run queries without opening a new
// connection each time.

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // TiDB Cloud Starter accepts MySQL connections over TLS on port 4000.
  // Local MySQL keeps using the existing non-TLS defaults.
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2' } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Quick check on startup so a wrong password / down MySQL fails loudly.
pool.getConnection()
  .then((conn) => {
    console.log('✅ Connected to MySQL database:', process.env.DB_NAME);
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Could not connect to MySQL:', err.message);
  });

module.exports = pool;
