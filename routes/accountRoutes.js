/** @format */

const express = require("express");
const router = express.Router();
// MIDDLEWARE IMPORTS
const { verifyToken } = require("../middleware/auth.middleware");
const { fraudCheck } = require("../middleware/fraudMiddleware");
const { ukOnlyGeoCheck } = require("../middleware/geoMiddleware");

// CONTROLLERS
const accountController = require("../controllers/accountController");

// ROUTES

// Create a new account
router.post(
  "/",
  verifyToken, // JWT auth
  ukOnlyGeoCheck, // Geo-location check (UK only)
  fraudCheck, // Fraud detection
  accountController.createAccount,
);

// Get all accounts
router.get("/", verifyToken, ukOnlyGeoCheck, accountController);

// Get a single account by ID
router.get("/:id", verifyToken, ukOnlyGeoCheck, accountController);

// Update account
router.put("/:id", verifyToken, ukOnlyGeoCheck, accountController);

// Delete account
router.delete("/:id", verifyToken, ukOnlyGeoCheck, async (req, res, next) => {
  try {
    await accountController.deleteAccount(req, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
