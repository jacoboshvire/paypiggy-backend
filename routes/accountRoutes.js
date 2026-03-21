/** @format */

const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");
const verifyToken = require("../middleware/auth.middleware");
const fraudCheck = require("../middleware/fraudMiddleware");
const ukOnlyGeoCheck = require("../middleware/geoMiddleware");

router.post(
  "/",
  verifyToken,
  ukOnlyGeoCheck,
  fraudCheck,
  accountController.createAccount,
);
router.get("/", verifyToken, ukOnlyGeoCheck, accountController.getAllAccounts);
router.get(
  "/:id",
  verifyToken,
  ukOnlyGeoCheck,
  accountController.getAccountById,
);
router.put(
  "/:id",
  verifyToken,
  ukOnlyGeoCheck,
  accountController.updateAccount,
);
router.delete(
  "/:id",
  verifyToken,
  ukOnlyGeoCheck,
  accountController.deleteAccount,
);

module.exports = router;
