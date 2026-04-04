/** @format */

const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
} = require("../controllers/userController");

router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);

module.exports = router;
