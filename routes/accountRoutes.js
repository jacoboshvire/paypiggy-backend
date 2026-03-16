/** @format */

const express = require("express");
const router = express.Router();
const {
  getTransaction,
  deleteTransaction,
  postTransaction,
} = require("../controllers/transactionController");
const { get } = require("./userRoutes");

router.get("/", getTransaction);

module.exports = router();
