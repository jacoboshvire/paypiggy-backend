/** @format */

const db = require("../config/db");
const { calculateRisk } = require("../service/fraud.service");
const {
  sendTransactionEmail,
  sendTransactionSms,
} = require("../utils/sendotp");
const admin = require("../utils/firebase");

const FRAUD_RULES = {
  MAX_TRANSACTIONS_PER_MINUTE: 5,
  LARGE_AMOUNT_THRESHOLD: 10000,
  MIN_ACCOUNT_AGE_DAYS: 0,
  MIN_USER_AGE: 18,
  REQUIRE_ADDRESS: true,
  AGE_RESTRICTED_AMOUNT: 500,
  DAILY_TRANSFER_LIMIT: 5000, // £5000 per day
};

// ----------------------
// NOTIFY USER (ALL CHANNELS)
// ----------------------
const notifyFraudAlert = async (userId, reason) => {
  try {
    const [users] = await db.query(
      "SELECT email, phone, fcm_token, name FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) return;
    const user = users[0];

    const message = `Security Alert for ${user.name}: Your transaction was flagged — ${reason}. If this wasn't you, please contact support immediately.`;

    if (user.email) {
      await sendTransactionEmail(user.email, message).catch((err) =>
        console.error("Email alert failed:", err.message),
      );
    }

    if (user.phone) {
      await sendTransactionSms(user.phone, message).catch((err) =>
        console.error("SMS alert failed:", err.message),
      );
    }

    if (user.fcm_token) {
      await admin
        .messaging()
        .send({
          token: user.fcm_token,
          notification: {
            title: "Security Alert",
            body: message,
          },
          data: { type: "fraud_alert", reason },
        })
        .catch((err) => console.error("Push alert failed:", err.message));
    }
  } catch (err) {
    console.error("Fraud notification error:", err.message);
  }
};

// ----------------------
// VALIDATE TRANSFER INPUT
// ----------------------
const validateTransfer = (req, res, next) => {
  const { amount, fromAccount, toAccountNumber, toSortCode, toName } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  if (!fromAccount) {
    return res.status(400).json({ message: "Sender account is required" });
  }

  if (!toAccountNumber || !toSortCode || !toName) {
    return res.status(400).json({
      message: "Receiver account number, sort code and name are required",
    });
  }

  next();
};

// ----------------------
// VELOCITY CHECK
// ----------------------
const checkVelocity = async (userId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM transactions 
     WHERE from_account IN (SELECT id FROM accounts WHERE user_id = ?)
     AND created_at >= NOW() - INTERVAL 1 MINUTE`,
    [userId],
  );

  return rows[0].count >= FRAUD_RULES.MAX_TRANSACTIONS_PER_MINUTE;
};

// ----------------------
// ACCOUNT AGE CHECK
// ----------------------
const checkAccountAge = async (userId) => {
  const [rows] = await db.query(`SELECT created_at FROM users WHERE id = ?`, [
    userId,
  ]);

  if (rows.length === 0) return true;

  const createdAt = new Date(rows[0].created_at);
  const diffDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);

  return diffDays < FRAUD_RULES.MIN_ACCOUNT_AGE_DAYS;
};

// ----------------------
// IP CHECK
// ----------------------
const checkSuspiciousIP = async (ip) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM transactions 
     WHERE ip_address = ?
     AND created_at >= NOW() - INTERVAL 1 HOUR`,
    [ip],
  );

  return rows[0].count > 20;
};

// ----------------------
// LOG FRAUD EVENT
// ----------------------
const logFraudEvent = async (userId, reason, ip, amount) => {
  try {
    await db.query(
      `INSERT INTO fraud_logs (user_id, reason, ip_address, amount) VALUES (?, ?, ?, ?)`,
      [userId, reason, ip, amount],
    );
  } catch (err) {
    console.error("Failed to log fraud event:", err.message);
  }
};

// ----------------------
// USER AGE CHECK
// ----------------------
const checkUserAge = async (userId) => {
  const [rows] = await db.query(
    "SELECT date_of_birth FROM accounts WHERE user_id = ?",
    [userId],
  );

  if (rows.length === 0 || !rows[0].date_of_birth) return false;

  const dob = new Date(rows[0].date_of_birth);
  const age = Math.floor((Date.now() - dob) / (1000 * 60 * 60 * 24 * 365.25));

  return age < FRAUD_RULES.MIN_USER_AGE;
};

// ----------------------
// ADDRESS CHECK
// ----------------------
const checkAddress = async (userId) => {
  const [rows] = await db.query(
    "SELECT address_line1, postcode FROM accounts WHERE user_id = ?",
    [userId],
  );

  if (rows.length === 0) return true;
  return !rows[0].address_line1 || !rows[0].postcode;
};

// ----------------------
// AGE RESTRICTED AMOUNT CHECK
// ----------------------
const checkAgeRestrictedAmount = async (userId, amount) => {
  const [rows] = await db.query(
    "SELECT date_of_birth FROM accounts WHERE user_id = ?",
    [userId],
  );

  if (rows.length === 0 || !rows[0].date_of_birth) return false;

  const dob = new Date(rows[0].date_of_birth);
  const age = Math.floor((Date.now() - dob) / (1000 * 60 * 60 * 24 * 365.25));

  return age < 18 && amount >= FRAUD_RULES.AGE_RESTRICTED_AMOUNT;
};

// ----------------------
// DAILY LIMIT CHECK
// ----------------------
const checkDailyLimit = async (userId, amount) => {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(t.amount), 0) as total
     FROM transactions t
     JOIN accounts a ON t.from_account = a.id
     WHERE a.user_id = ?
     AND DATE(t.created_at) = CURDATE()`,
    [userId],
  );

  const totalToday = parseFloat(rows[0].total);
  return totalToday + amount > FRAUD_RULES.DAILY_TRANSFER_LIMIT;
};

// ----------------------
// MAIN FRAUD CHECK
// ----------------------
const fraudCheck = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const ip =
      req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const blockTransaction = async (statusCode, message, reason) => {
      await Promise.all([
        notifyFraudAlert(userId, reason),
        logFraudEvent(userId, reason, ip, amount),
      ]);
      return res.status(statusCode).json({ message, reason });
    };

    // 1. Large amount check
    if (amount > FRAUD_RULES.LARGE_AMOUNT_THRESHOLD) {
      return await blockTransaction(
        400,
        "Transaction flagged",
        "Amount too large",
      );
    }

    // 2. Velocity check
    if (await checkVelocity(userId)) {
      return await blockTransaction(
        429,
        "Too many transactions",
        "Velocity limit exceeded",
      );
    }

    // 3. Account age check
    if (await checkAccountAge(userId)) {
      return await blockTransaction(
        403,
        "Account too new",
        "Account age below minimum",
      );
    }

    // 4. IP check
    if (await checkSuspiciousIP(ip)) {
      return await blockTransaction(
        403,
        "Suspicious activity detected",
        "Suspicious IP address",
      );
    }

    // 5. Age restricted amount — require OTP if under 18 and amount >= 500
    if (await checkAgeRestrictedAmount(userId, amount)) {
      req.requiresOtp = true;
      return next();
    }

    // 6. User age check — block completely if under 18 and amount < 500
    if (await checkUserAge(userId)) {
      return await blockTransaction(
        403,
        "Transaction blocked",
        "User does not meet minimum age requirement",
      );
    }

    // 7. Risk scoring
    const { risk, reasons } = await calculateRisk({ userId, amount });

    req.fraud = { risk, reasons };

    if (risk >= 70) {
      await Promise.all([
        notifyFraudAlert(userId, reasons.join(", ")),
        logFraudEvent(userId, reasons.join(", "), ip, amount),
      ]);

      return res.status(403).json({
        message: "Transaction blocked",
        risk,
        reasons,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({
      error: "Fraud check failed",
      details: err.message,
    });
  }
};

module.exports = {
  fraudCheck,
  validateTransfer,
  checkVelocity,
  checkAccountAge,
  checkSuspiciousIP,
  logFraudEvent,
  checkUserAge,
  checkAddress,
  checkAgeRestrictedAmount,
  notifyFraudAlert,
};
