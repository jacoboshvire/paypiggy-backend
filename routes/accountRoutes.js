/** @format */

const express = require("express");
const router = express.Router();
const {
  getTransaction,
  deleteTransaction,
  postTransaction,
} = require("../controllers/transactionController");

module.exports = router();
