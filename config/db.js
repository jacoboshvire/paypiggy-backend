/** @format */

// db.js
const mysql = require("mysql2");
const dotenv = require("dotenv");

// setting up dotenv
dotenv.config();

const pool = mysql
  .createPool({
    host: "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE_NAME,
  })
  .promise();

module.exports = pool;
