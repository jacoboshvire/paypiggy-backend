/** @format */

const rateLimit = require("express-rate-limit");

exports.transferLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many requests",
});

exports.calculateRisk = async ({ userId, amount }) => {
  const reasons = [];
  let risk = 0;

  // Large amount adds risk
  if (amount > 5000) {
    risk += 40;
    reasons.push("Large transaction amount");
  }

  if (amount > 8000) {
    risk += 30;
    reasons.push("Very large transaction amount");
  }

  return { risk, reasons };
};
