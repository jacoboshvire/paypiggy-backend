/** @format */
const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
} = require("../controllers/userController");

router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
