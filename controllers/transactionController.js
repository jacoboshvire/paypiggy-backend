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
