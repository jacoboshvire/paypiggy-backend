/** @format */

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const { transferMoney } = require("../controllers/transaction.controller");

router.post("/transfer", auth, transferMoney);

module.exports = router;
