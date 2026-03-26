/** @format */

const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth.middleware");
const {
  fraudCheck,
  validateTransfer,
} = require("../middleware/fraudMiddleware");
const {
  transferMoney,
  getTransactionHistory,
} = require("../controllers/transaction.controller");

router.post(
  "/transfer",
  auth,
  validateTransfer,
  idempotencyCheck,
  fraudCheck,
  transferMoney,
);
router.get("/history/:accountId", auth, getTransactionHistory);

module.exports = router;
