/** @format */

const db = require("../config/db");

// POST /api/accounts
const createAccount = async (req, res) => {
  try {
    const { user_id, account_type } = req.body;

    const account_number = Math.floor(
      10000000 + Math.random() * 90000000,
    ).toString();
    const part = () => Math.floor(10 + Math.random() * 90);
    const sort_code = `${part()}-${part()}-${part()}`;

    const [result] = await db.query(
      `INSERT INTO accounts (user_id, account_number, sort_code, balance, account_type)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, account_number, sort_code, 0.0, account_type ?? "standard"],
    );

    res.status(201).json({
      message: "Account created",
      accountId: result.insertId,
      account_number,
      sort_code,
      balance: 0.0,
      account_type: account_type ?? "standard",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/accounts
const getAllAccounts = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM accounts`);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/accounts/:id
const getAccountById = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM accounts WHERE id = ?`, [
      req.params.id,
    ]);

    if (rows.length === 0)
      return res.status(404).json({ message: "Account not found" });

    res.status(200).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/accounts/:id
const updateAccount = async (req, res) => {
  try {
    const { balance, account_type } = req.body;

    // Build query dynamically based on what's provided
    const fields = [];
    const values = [];

    if (balance !== undefined) {
      fields.push("balance = ?");
      values.push(balance);
    }

    if (account_type !== undefined && account_type !== "") {
      fields.push("account_type = ?");
      values.push(account_type);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(req.params.id);

    const [result] = await db.query(
      `UPDATE accounts SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Account not found" });

    res.status(200).json({ message: "Account updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// DELETE /api/accounts/:id
const deleteAccount = async (req, res) => {
  try {
    const [result] = await db.query(`DELETE FROM accounts WHERE id = ?`, [
      req.params.id,
    ]);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Account not found" });

    res.status(200).json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
};
