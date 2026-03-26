/** @format */

const db = require("../config/db");
const { calculateRisk } = require("../service/fraud.service");

const FRAUD_RULES = {
  MAX_TRANSACTIONS_PER_MINUTE: 5,
  LARGE_AMOUNT_THRESHOLD: 10000,
  MIN_ACCOUNT_AGE_DAYS: 1,
};

// ----------------------
// VALIDATE TRANSFER INPUT
// ----------------------
const validateTransfer = (req, res, next) => {
  const { amount, from_account_id, to_account_id } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  if (!from_account_id || !to_account_id) {
    return res.status(400).json({
      message: "Both sender and receiver accounts are required",
    });
  }

  if (from_account_id === to_account_id) {
    return res.status(400).json({
      message: "Cannot transfer to same account",
    });
  }

  next();
};

// ----------------------
// VELOCITY CHECK (FIXED)
// ----------------------
const checkVelocity = async (userId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM transactions 
     WHERE user_id = ?
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
// IP CHECK (IMPROVED)
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
// MAIN FRAUD CHECK
// ----------------------
const fraudCheck = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const ip =
      req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // 1. Basic checks
    if (amount > FRAUD_RULES.LARGE_AMOUNT_THRESHOLD) {
      return res.status(400).json({
        message: "Transaction flagged",
        reason: "Amount too large",
      });
    }

    if (await checkVelocity(userId)) {
      return res.status(429).json({
        message: "Too many transactions",
      });
    }

    if (await checkAccountAge(userId)) {
      return res.status(403).json({
        message: "Account too new",
      });
    }

    if (await checkSuspiciousIP(ip)) {
      return res.status(403).json({
        message: "Suspicious activity detected",
      });
    }

    // 2. Risk scoring
    const { risk, reasons } = await calculateRisk({
      userId,
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
};
