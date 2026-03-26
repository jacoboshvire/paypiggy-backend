/** @format */

const db = require("../config/db");
const { calculateRisk } = require("../services/fraud.service");

const FRAUD_RULES = {
  MAX_TRANSACTIONS_PER_MINUTE: 5,
  LARGE_AMOUNT_THRESHOLD: 10000,
  MIN_ACCOUNT_AGE_DAYS: 1,
};

// Velocity check — too many requests in short time
const checkVelocity = async (userId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM accounts
     WHERE user_id = ? AND created_at >= NOW() - INTERVAL 1 MINUTE`,
    [userId],
  );
  return rows[0].count >= FRAUD_RULES.MAX_TRANSACTIONS_PER_MINUTE;
};

// Large/unusual amount check
const checkLargeAmount = (balance) => {
  return parseFloat(balance) > FRAUD_RULES.LARGE_AMOUNT_THRESHOLD;
};

// Duplicate account number check
const checkDuplicateAccount = async (accountNumber) => {
  const [rows] = await db.query(
    `SELECT id FROM accounts WHERE account_number = ?`,
    [accountNumber],
  );
  return rows.length > 0;
};

// Suspicious IP check — flag known bad IP ranges or repeated IPs
const checkSuspiciousIP = async (ip) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM accounts
     WHERE created_by_ip = ? AND created_at >= NOW() - INTERVAL 1 HOUR`,
    [ip],
  );
  // More than 10 accounts created from same IP in 1 hour is suspicious
  return rows[0].count >= 10;
};

// Age check — user account must be old enough
const checkAccountAge = async (userId) => {
  const [rows] = await db.query(`SELECT created_at FROM users WHERE id = ?`, [
    userId,
  ]);

  if (rows.length === 0) return true; // user not found = suspicious

  const createdAt = new Date(rows[0].created_at);
  const now = new Date();
  const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);

  return diffDays < FRAUD_RULES.MIN_ACCOUNT_AGE_DAYS;
};

// Main fraud detection middleware
const fraudCheck = async (req, res, next) => {
  try {
    const { user_id, account_number, balance } = req.body;
    const ip =
      req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // 1. Velocity check
    const tooManyRequests = await checkVelocity(user_id);
    if (tooManyRequests) {
      return res.status(429).json({
        error: "Fraud detected",
        reason: "Too many accounts created in a short period",
      });
    }

    // 2. Large amount check
    if (balance && checkLargeAmount(balance)) {
      return res.status(400).json({
        error: "Fraud detected",
        reason: `Opening balance exceeds allowed threshold of £${FRAUD_RULES.LARGE_AMOUNT_THRESHOLD.toLocaleString()}`,
      });
    }

    // 3. Duplicate account number
    if (account_number) {
      const isDuplicate = await checkDuplicateAccount(account_number);
      if (isDuplicate) {
        return res.status(409).json({
          error: "Fraud detected",
          reason: "Account number already exists",
        });
      }
    }

    // 4. Suspicious IP
    const suspiciousIP = await checkSuspiciousIP(ip);
    if (suspiciousIP) {
      return res.status(403).json({
        error: "Fraud detected",
        reason: "Too many accounts created from this IP address",
      });
    }

    // 5. Account age check
    const tooNew = await checkAccountAge(user_id);
    if (tooNew) {
      return res.status(403).json({
        error: "Fraud detected",
        reason: "User account is too new to create a bank account",
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Fraud check failed", details: err.message });
  }
};

exports.fraudCheck = async (req, res, next) => {
  const { amount } = req.body;

  const { risk, reasons } = await calculateRisk({
    userId: req.user.id,
    amount,
  });

  req.fraud = { risk, reasons };

  if (risk >= 70) {
    return res.status(403).json({
      message: "Transaction blocked",
      risk,
      reasons,
    });
  }

  next();
};

module.exports = fraudCheck;
