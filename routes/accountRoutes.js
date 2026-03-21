/** @format */

const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");
const verifyToken = require("../middleware/auth.middleware");
const fraudCheck = require("../middleware/fraudMiddleware");

// fraudCheck only applies to POST (account creation)
router.post("/", verifyToken, fraudCheck, accountController.createAccount);
router.get("/", verifyToken, accountController.getAllAccounts);
router.get("/:id", verifyToken, accountController.getAccountById);
router.put("/:id", verifyToken, accountController.updateAccount);
router.delete("/:id", verifyToken, accountController.deleteAccount);

module.exports = router;
