/** @format */

// db.js
const mysql = require("mysql2");
const env = require("dotenv");
const pool = mysql
  .createPool({
    host: "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "your-database",
  })
  .promise();

module.exports = pool;
