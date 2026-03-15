/** @format */

// db.js
const mysql = require("mysql2");

const pool = mysql
  .createPool({
    host: "localhost",
    user: "root",
    password: "your-password",
    database: "your-database",
  })
  .promise();

module.exports = pool;
