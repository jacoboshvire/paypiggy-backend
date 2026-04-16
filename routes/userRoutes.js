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

router.use(express.urlencoded({ extended: true }));

router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", upload.single("avatar"), updateUser);

module.exports = router;
