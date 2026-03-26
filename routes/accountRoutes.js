/** @format */

const express = require("express");
const router = express.Router();

// MIDDLEWARE
const verifyToken = require("../middleware/auth.middleware");
const { fraudCheck } = require("../middleware/fraudMiddleware");
const { ukOnlyGeoCheck } = require("../middleware/geoMiddleware");

// CONTROLLERS
const {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
} = require("../controllers/accountController");

// ----------------------
// ROUTES
// ----------------------

// ✅ Create account
router.post("/", verifyToken, ukOnlyGeoCheck, fraudCheck, createAccount);

// ✅ Get all accounts
router.get("/", verifyToken, ukOnlyGeoCheck, getAllAccounts);

// ✅ Get single account
router.get("/:id", verifyToken, ukOnlyGeoCheck, getAccountById);

// ✅ Update account
router.put("/:id", verifyToken, ukOnlyGeoCheck, updateAccount);

// ✅ Delete account
router.delete("/:id", verifyToken, ukOnlyGeoCheck, deleteAccount);

module.exports = router;
