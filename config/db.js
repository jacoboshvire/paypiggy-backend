/** @format */

// db.js
const mysql = require("mysql2");

const pool = mysql
  .createPool({
    host: "localhost",
    user: process.env.DB_USER,
    password: "your-password",
    database: "your-database",
  })
  .promise();

module.exports = pool;
