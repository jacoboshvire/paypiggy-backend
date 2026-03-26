/** @format */

const express = require("express");
const router = express.Router();

// ----------------------
// MIDDLEWARE IMPORTS
// ----------------------
const { verifyToken } = require("../middleware/auth.middleware");
const { fraudCheck } = require("../middleware/fraudMiddleware");
const { ukOnlyGeoCheck } = require("../middleware/geoMiddleware");

// ----------------------
// CONTROLLERS
// ----------------------
const accountController = require("../controllers/accountController");

// ----------------------
// ROUTES
// ----------------------

// Create a new account
router.post(
  "/",
  verifyToken, // JWT auth
  ukOnlyGeoCheck, // Geo-location check (UK only)
  fraudCheck, // Fraud detection
  async (req, res, next) => {
    try {
      await accountController.createAccount(req, res);
    } catch (err) {
      next(err); // async-safe
    }
  },
);

// Get all accounts
router.get("/", verifyToken, ukOnlyGeoCheck, async (req, res, next) => {
  try {
    await accountController.getAllAccounts(req, res);
  } catch (err) {
    next(err);
  }
});

// Get a single account by ID
router.get("/:id", verifyToken, ukOnlyGeoCheck, async (req, res, next) => {
  try {
    await accountController.getAccountById(req, res);
  } catch (err) {
    next(err);
  }
});

// Update account
router.put("/:id", verifyToken, ukOnlyGeoCheck, async (req, res, next) => {
  try {
    await accountController.updateAccount(req, res);
  } catch (err) {
    next(err);
  }
});

// Delete account
router.delete("/:id", verifyToken, ukOnlyGeoCheck, async (req, res, next) => {
  try {
    await accountController.deleteAccount(req, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
