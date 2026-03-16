/** @format */

const db = require("../config/db");

exports.fetchUsers = async () => {
  const [rows] = await db.query("SELECT * FROM users");
  return rows;
};
