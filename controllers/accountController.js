/** @format */

const db = require("../config/db");

// POST /api/accounts
const createAccount = async (req, res) => {
  try {
    const { user_id, account_type, first_name, last_name } = req.body;

    const account_number = Math.floor(
      10000000 + Math.random() * 90000000,
    ).toString();
    const part = () => Math.floor(10 + Math.random() * 90);
    const sort_code = `${part()}-${part()}-${part()}`;

    const [result] = await db.query(
      `INSERT INTO accounts (user_id, account_number, sort_code, balance, account_type, first_name, last_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        account_number,
        sort_code,
        0.0,
        account_type ?? "standard",
        first_name ?? null,
        last_name ?? null,
      ],
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
    const [rows] = await db.query(`SELECT * FROM accounts WHERE user_id = ?`, [
      req.user.id,
    ]);
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

// PUT /api/account/:id
const updateAccount = async (req, res) => {
  try {
    const {
      balance,
      account_type,
      first_name,
      last_name,
      date_of_birth,
      address_line1,
      address_line2,
      city,
      postcode,
      country,
    } = req.body;

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
    if (first_name !== undefined && first_name !== "") {
      fields.push("first_name = ?");
      values.push(first_name.trim());
    }

    if (last_name !== undefined && last_name !== "") {
      fields.push("last_name = ?");
      values.push(last_name.trim());
    }

    if (date_of_birth !== undefined && date_of_birth !== "") {
      fields.push("date_of_birth = ?");
      values.push(date_of_birth);
    }
    if (address_line1 !== undefined && address_line1 !== "") {
      fields.push("address_line1 = ?");
      values.push(address_line1);
    }
    if (address_line2 !== undefined && address_line2 !== "") {
      fields.push("address_line2 = ?");
      values.push(address_line2);
    }
    if (city !== undefined && city !== "") {
      fields.push("city = ?");
      values.push(city);
    }
    if (postcode !== undefined && postcode !== "") {
      fields.push("postcode = ?");
      values.push(postcode);
    }
    if (country !== undefined && country !== "") {
      fields.push("country = ?");
      values.push(country);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(req.params.id);
    values.push(req.user.id);

    const [result] = await db.query(
      `UPDATE accounts SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
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

//DEPOSIT MONEY - POST /api/accounts/:id/deposit
const depositMoney = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const [result] = await db.query(
      `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
      [amount, req.params.id],
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Account not found" });

    res.status(200).json({ message: "Deposit successful" });
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
  depositMoney,
};
