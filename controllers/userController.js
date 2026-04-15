/** @format */

const db = require("../config/db");

exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, phone, avatar, created_at FROM users",
    );
    res.json({ status: "success", data: users });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, phone, avatar, created_at FROM users WHERE id = ?",
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined && name !== "") {
      fields.push("name = ?");
      values.push(name);
    }

    if (phone !== undefined && phone !== "") {
      fields.push("phone = ?");
      values.push(phone);
    }

    // If image uploaded via multer
    if (req.file) {
      fields.push("avatar = ?");
      values.push(req.file.path); // cloudinary URL
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(req.params.id);

    const [result] = await db.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User updated",
      avatar: req.file ? req.file.path : null,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
