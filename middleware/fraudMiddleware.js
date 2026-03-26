/** @format */

const db = require("../config/db");
const { calculateRisk } = require("../services/fraud.service");

const FRAUD_RULES = {
  MAX_TRANSACTIONS_PER_MINUTE: 5,
  LARGE_AMOUNT_THRESHOLD: 10000,
  MIN_ACCOUNT_AGE_DAYS: 1,
};

// Velocity check (FIXED → uses transactions)
const checkVelocity = async (userId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM transactions 
     WHERE created_at >= NOW() - INTERVAL 1 MINUTE`,
  );

  return rows[0].count >= FRAUD_RULES.MAX_TRANSACTIONS_PER_MINUTE;
};

// Account age check
const checkAccountAge = async (userId) => {
  const [rows] = await db.query(`SELECT created_at FROM users WHERE id = ?`, [
    userId,
  ]);

  if (rows.length === 0) return true;

  const createdAt = new Date(rows[0].created_at);
  const now = new Date();
  const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);

  return diffDays < FRAUD_RULES.MIN_ACCOUNT_AGE_DAYS;
};

// ✅ Suspicious IP check
const checkSuspiciousIP = async (ip) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM transactions 
     WHERE created_at >= NOW() - INTERVAL 1 HOUR`,
  );

  return rows[0].count > 20;
};

// 🔥 MAIN FRAUD MIDDLEWARE
const fraudCheck = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const ip =
      req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // 🧠 1. Basic rule checks
    if (amount > FRAUD_RULES.LARGE_AMOUNT_THRESHOLD) {
      return res.status(400).json({
        message: "Transaction flagged",
        reason: "Amount too large",
      });
    }

    const tooFast = await checkVelocity(userId);
    if (tooFast) {
      return res.status(429).json({
        message: "Too many transactions",
      });
    }

    const tooNew = await checkAccountAge(userId);
    if (tooNew) {
      return res.status(403).json({
        message: "Account too new",
      });
    }

    const suspiciousIP = await checkSuspiciousIP(ip);
    if (suspiciousIP) {
      return res.status(403).json({
        message: "Suspicious activity detected",
      });
    }

    // 🧠 2. Risk scoring engine
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

module.exports = { fraudCheck };
