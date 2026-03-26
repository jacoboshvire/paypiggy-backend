/** @format */

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");

// middleware
const {
  fraudCheck,
  validateTransfer,
} = require("../middleware/fraudMiddleware");

const { idempotencyCheck } = require("../middleware/idempotency.middleware");

// controllers
const {
  transferMoney,
  getTransactionHistory,
} = require("../controllers/transactionController");

// ----------------------
// ROUTES
// ----------------------

// Transfer money
router.post(
  "/transfer",
  auth,
  validateTransfer,
  idempotencyCheck,
  fraudCheck,
  transferMoney,
);

// Transaction history
router.get("/history/:accountId", auth, getTransactionHistory);

module.exports = router;
