/** @format */

const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER_PROD,
    password: process.env.DB_PASSWORD || process.env.DB_PASSWORD_PROD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  })
  .promise();

// Test connection
pool
  .getConnection()
  .then((conn) => {
    console.log("Database connected successfully");
    conn.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
  });

module.exports = pool;
