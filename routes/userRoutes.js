/** @format */
const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
} = require("../controllers/userController");
const { upload } = require("../config/cloudinary");

router.use(express.urlencoded({ extended: true }));

router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", upload.single("avatar"), updateUser);

module.exports = router;
