const express = require("express");
const authController = require("../../controllers/admin/authController");
const validateRequest = require("../../middleware/validateRequest");
const { protect } = require("../../middleware/protect");

const {
  loginValidator,
  verifyCodeValidator,
  resendCodeValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  // registerValidator,
  // googleLoginValidator,
  // facebookLoginValidator,
} = require("../../validators/auth_validator");

const router = express.Router();

router.post("/login", loginValidator, validateRequest, authController.login);

router.post("/change-temp-password", authController.changeTemporaryPassword);

router.post("/verify-token", authController.refreshOrValidateToken);

router.post("/logout", protect("user"), authController.logout);

// router.post(
//   "/forgot-password",
//   forgotPasswordValidator,
//   validateRequest,
//   authController.forgotPassword
// );

// router.post(
//   "/reset-password",
//   resetPasswordValidator,
//   validateRequest,
//   authController.resetPassword
// );

// router.post(
//   "/verify-code",
//   verifyCodeValidator,
//   validateRequest,
//   authController.verifyCode
// );

// router.post(
//   "/resend-code",
//   resendCodeValidator,
//   validateRequest,
//   authController.resendCode
// );

// router.post(
//   "/signup",
//   registerValidator,
//   validateRequest,
//   authController.register
// );

// router.post(
//   "/google-login",
//   googleLoginValidator,
//   validateRequest,
//   authController.googleLogin
// );

// router.post(
//   "/facebook-login",
//   facebookLoginValidator,
//   validateRequest,
//   authController.facebookLogin
// );

module.exports = router;
