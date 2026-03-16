/** @format */

const express = require("express");
const router = express.Router();
const {
  getAccount,
  deleteAccount,
  postTransaction,
} = require("../controllers/transactionController");
const { get } = require("./userRoutes");

router.get("/", getAccount);
router.post("/", postAccount);
router.delete("/", deleteAccount);

module.exports = router();
