const express = require("express");
const authController = require("../../controllers/customer/authController");
const validateRequest = require("../../middleware/validateRequest");

const {
  registerValidator,
  loginValidator,
  verifyCodeValidator,
  resendCodeValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  googleLoginValidator,
  facebookLoginValidator,
  verify2FAValidator,
} = require("../../validators/auth_validator");

const router = express.Router();

router.post(
  "/register",
  registerValidator,
  validateRequest,
  authController.register
);

router.post("/login", loginValidator, validateRequest, authController.preLogin);

router.post(
  "/verify-2fa",
  verify2FAValidator,
  validateRequest,
  authController.verify2FA
);

router.post(
  "/verify-code",
  verifyCodeValidator,
  validateRequest,
  authController.verifyCode
);

router.post(
  "/resend-code",
  resendCodeValidator,
  validateRequest,
  authController.resendCode
);

router.post(
  "/forgot-password",
  forgotPasswordValidator,
  validateRequest,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  resetPasswordValidator,
  validateRequest,
  authController.resetPassword
);

router.post(
  "/logout",
  authController.logout 
);

router.post(
  "/google-login",
  googleLoginValidator,
  validateRequest,
  authController.googleLogin
);

router.post(
  "/facebook-login",
  facebookLoginValidator,
  validateRequest,
  authController.facebookLogin
);

router.post(
  "/verify-token",
  authController.refreshOrValidateToken 
  
);

module.exports = router;
