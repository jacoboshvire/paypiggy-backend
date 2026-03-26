/** @format */

const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const {
  fraudCheck,
  validateTransfer,
} = require("../middleware/fraudMiddleware");
const {
  transferMoney,
  getTransactionHistory,
} = require("../controllers/transactionController");

router.post(
  "/transfer",
  verifyToken,
  validateTransfer,
  fraudCheck,
  transferMoney,
);
router.get("/history/:accountId", verifyToken, getTransactionHistory);

module.exports = router;
