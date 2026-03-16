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

exports.createUser = async (req, res) => {
  try {
    res.json({ status: "success", infor: "createdUser" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    res.json({ status: "success", infor: "user Edited" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
    try{
        res.json({status: "success", infor: "User delete"})
    }
}
