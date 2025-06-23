const express = require("express");
const authController = require("../../controllers/authController");
// const { setRole } = require("../../middleware/setRole");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-code", authController.verifyCode);
router.post("/resend-code", authController.resendCode);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/logout", authController.logout);
router.post("/google-login", authController.googleLogin);
router.post("/verify-token", authController.refreshOrValidateToken);

// router.post("/logout", authController.logout);
// router.post("/google-login", authController.googleLogin);
// router.post("/confirm-email/:confirmationCode", authController.confirmEmail);
// router.post("/forgot-password", authController.forgotPassword);
// router.post("/reset-password/:resetToken", authController.reset);

module.exports = router;
