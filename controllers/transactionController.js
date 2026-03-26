/** @format */

const db = require("../config/db");

exports.transferMoney = async (req, res) => {
  const { fromAccount, toAccount, amount } = req.body;

  if (!fromAccount || !toAccount || !amount) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Check sender balance
    const [sender] = await connection.query(
      "SELECT balance FROM accounts WHERE id = ?",
      [fromAccount],
    );

    if (sender.length === 0) {
      throw new Error("Sender account not found");
    }

    if (sender[0].balance < amount) {
      throw new Error("Insufficient balance");
    }

    // 2. Deduct from sender
    await connection.query(
      "UPDATE accounts SET balance = balance - ? WHERE id = ?",
      [amount, fromAccount],
    );

    // 3. Add to receiver
    await connection.query(
      "UPDATE accounts SET balance = balance + ? WHERE id = ?",
      [amount, toAccount],
    );

    // 4. Record transaction
    await connection.query(
      "INSERT INTO transactions (from_account, to_account, amount) VALUES (?, ?, ?)",
      [fromAccount, toAccount, amount],
    );

    await connection.commit();

    res.json({ message: "Transfer successful" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

// GET TRANSACTION HISTORY
exports.getTransactionHistory = async (req, res) => {
  const { accountId } = req.params;
  const userId = req.user.id;

  const {
    page = 1,
    limit = 10,
    type,
    minAmount,
    maxAmount,
    startDate,
    endDate,
  } = req.query;

  const offset = (page - 1) * limit;

  try {
    // 1. Verify ownership
    const [account] = await db.query(
      "SELECT * FROM accounts WHERE id = ? AND user_id = ?",
      [accountId, userId],
    );

    if (account.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 2. Build query dynamically
    let query = `
      SELECT 
        le.id,
        le.type,
        le.amount,
        le.created_at,
        t.reference
      FROM ledger_entries le
      JOIN transactions t ON le.transaction_id = t.id
      WHERE le.account_id = ?
    `;

    const params = [accountId];

    if (type) {
      query += " AND le.type = ?";
      params.push(type);
    }

    if (minAmount) {
      query += " AND le.amount >= ?";
      params.push(minAmount);
    }

    if (maxAmount) {
      query += " AND le.amount <= ?";
      params.push(maxAmount);
    }

    if (startDate) {
      query += " AND le.created_at >= ?";
      params.push(startDate);
    }

    if (endDate) {
      query += " AND le.created_at <= ?";
      params.push(endDate);
    }

    query += " ORDER BY le.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);

    res.json({
      page: Number(page),
      limit: Number(limit),
      results: rows,
    });
  } catch (err) {
    res.status(500).json(err);
  }
};
