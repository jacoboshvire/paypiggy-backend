/** @format */

const express = require("express");
const router = express.Router();
const {
  getTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");
module.exports = router();
