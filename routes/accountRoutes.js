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
router.post("/", postTransaction);
router.delete("/", deleteTransaction);

module.exports = router();
