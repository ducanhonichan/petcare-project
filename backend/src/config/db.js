const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Cloud MySQL services (TiDB Cloud, ...) only accept encrypted connections.
  // Set DB_SSL=true in the hosting environment variables; leave it out locally.
  ssl:
    process.env.DB_SSL === 'true'
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      : undefined,

  // Keep idle connections alive so a serverless database does not drop them
  enableKeepAlive: true,
});

module.exports = pool;
