/** @format */

const { fetchUsers, insertUser } = require("../models/userModel");

exports.getUsers = async (req, res) => {
  try {
    const users = await fetchUsers();
    res.json({ status: "success", data: users });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
