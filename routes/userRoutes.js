/** @format */

const express = require("express");
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
} = require("../controllers/userController");

router.get("/", getUsers);
router.post("/", createUser);
router.put("/", updateUser);
// router.delete("/", deleteuser);

module.exports = router;
