/** @format */

const rateLimit = require("express-rate-limit");

exports.transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5, // max 5 transfers per minute
  message: "Too many requests",
});
