const express = require("express");
const authController = require("../../controllers/admin/authController");
const validateRequest = require("../../middleware/validateRequest");
const { protect } = require("../../middleware/protect");

const { loginValidator } = require("../../validators/auth_validator");
const { auth } = require("google-auth-library");

const router = express.Router();

router.post("/login", loginValidator, validateRequest, authController.login);

router.post(
  "/change-temp-password/:userId",
  authController.changeTemporaryPassword
);

router.post("/verify-token", authController.refreshOrValidateToken);

router.post("/logout", protect("user"), authController.logout);

module.exports = router;
