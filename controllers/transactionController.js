/** @format */

const db = require("../config/db");
const admin = require("../utils/firebase");
const { sendOtpEmail, sendOtpSms } = require("../utils/sendotp");
const crypto = require("crypto");

// Generate unique reference number
const generateReference = () => {
  return "TXN" + crypto.randomBytes(6).toString("hex").toUpperCase();
};

// Notify user via all channels
const notifyUser = async (userId, message) => {
  try {
    const [users] = await db.query(
      "SELECT email, phone, fcm_token FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) return;
    const user = users[0];

    // Email
    if (user.email) {
      await sendTransactionEmail(user.email, message);
    }

    // SMS
    if (user.phone) {
      await sendTransactionSms(user.phone, message);
    }

    // Push
    if (user.fcm_token) {
      await admin.messaging().send({
        token: user.fcm_token,
        notification: { title: "Transaction Alert", body: message },
      });
    }
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};

exports.transferMoney = async (req, res) => {
  const { fromAccount, toAccountNumber, toSortCode, toName, amount, otp } =
    req.body;

  if (!fromAccount || !toAccountNumber || !toSortCode || !toName || !amount) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const TRANSFER_LIMIT = 10000;
  if (amount > TRANSFER_LIMIT) {
    return res.status(400).json({
      message: `Transfer limit is £${TRANSFER_LIMIT}`,
    });
  }

  // Split name
  const nameParts = toName
    .trim()
    .split(" ")
    .filter((part) => part !== "");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ").trim();

  console.log("Looking for:");
  console.log("Account number:", toAccountNumber);
  console.log("Sort code:", toSortCode);
  console.log("First name:", firstName);
  console.log("Last name:", lastName);
  // If OTP required but not provided — send OTP
  if (req.requiresOtp && !otp) {
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
    const user = users[0];
    const generatedOtp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "INSERT INTO otps (user_id, otp, channel, expires_at) VALUES (?, ?, ?, ?)",
      [req.user.id, generatedOtp, "email", expiresAt],
    );

    await sendOtpEmail(user.email, generatedOtp);

    return res.status(403).json({
      message: "OTP required for this transaction",
      requiresOtp: true,
    });
  }

  // If OTP provided — verify it
  if (otp) {
    const [rows] = await db.query(
      `SELECT * FROM otps 
       WHERE user_id = ? AND otp = ? AND verified = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, String(otp)],
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await db.query("UPDATE otps SET verified = TRUE WHERE id = ?", [
      rows[0].id,
    ]);
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Check sender balance
    const [sender] = await connection.query(
      "SELECT balance, user_id FROM accounts WHERE id = ?",
      [fromAccount],
    );

    if (sender.length === 0) throw new Error("Sender account not found");
    if (sender[0].balance < amount) throw new Error("Insufficient balance");

    // 2. Find receiver by account number, sort code, first and last name
    const [receiver] = await connection.query(
      `SELECT a.id, a.user_id, a.first_name, a.last_name 
       FROM accounts a
       WHERE a.account_number = ? 
       AND a.sort_code = ?
       AND LOWER(a.first_name) = LOWER(?)
       AND LOWER(a.last_name) = LOWER(?)`,
      [toAccountNumber, toSortCode, firstName, lastName],
    );

    if (receiver.length === 0) {
      throw new Error(
        "Receiver not found. Please check account number, sort code and name.",
      );
    }

    const toAccount = receiver[0].id;

    // 3. Deduct from sender
    await connection.query(
      "UPDATE accounts SET balance = balance - ? WHERE id = ?",
      [amount, fromAccount],
    );

    // 4. Add to receiver
    await connection.query(
      "UPDATE accounts SET balance = balance + ? WHERE id = ?",
      [amount, toAccount],
    );

    // 5. Record transaction with reference
    const reference = generateReference();
    const [txn] = await connection.query(
      "INSERT INTO transactions (from_account, to_account, amount, reference) VALUES (?, ?, ?, ?)",
      [fromAccount, toAccount, amount, reference],
    );

    const transactionId = txn.insertId;

    // 6. Write ledger entries
    await connection.query(
      "INSERT INTO ledger_entries (transaction_id, account_id, type, amount) VALUES (?, ?, 'debit', ?)",
      [transactionId, fromAccount, amount],
    );

    await connection.query(
      "INSERT INTO ledger_entries (transaction_id, account_id, type, amount) VALUES (?, ?, 'credit', ?)",
      [transactionId, toAccount, amount],
    );

    await connection.commit();

    // 7. Notify both users
    const senderUserId = sender[0].user_id;
    const receiverUserId = receiver[0].user_id;
    const recipientName = `${receiver[0].first_name} ${receiver[0].last_name}`;

    await notifyUser(
      senderUserId,
      `You sent £${amount} to ${recipientName}. Reference: ${reference}`,
    );
    await notifyUser(
      receiverUserId,
      `You received £${amount}. Reference: ${reference}`,
    );

    res.json({
      message: "Transfer successful",
      reference,
      recipient: recipientName,
    });
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

    res.json({ page: Number(page), limit: Number(limit), results: rows });
  } catch (err) {
    res.status(500).json(err);
  }
};
