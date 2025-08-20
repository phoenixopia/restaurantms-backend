const asyncHandler = require("../../utils/asyncHandler");
const AuthService = require("../../services/customer/auth_service");
const { success } = require("../../utils/apiResponse");
const { sendTokenResponse } = require("../../utils/sendTokenResponse");

// Register new user
exports.register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body, req.originalUrl);
  return success(res, result.message, null, 201);
});

exports.preLogin = asyncHandler(async (req, res) => {
  const result = await AuthService.preLogin(req.body);

  if (result.requires2FA) {
    return success(res, result.message, {
      requires2FA: true,
      customerId: result.customerId,
    });
  } else {
    return sendTokenResponse(result.customer, 200, res, req.originalUrl);
  }
});

exports.verify2FA = asyncHandler(async (req, res) => {
  const { customer } = await AuthService.verify2FA({ ...req.body, req });
  return sendTokenResponse(customer, 200, res, req.originalUrl);
});

// Verify email or phone confirmation code
exports.verifyCode = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyCode(req.body, req.originalUrl, res);
  if (result) {
    return success(res, result.message, result.data || null);
  }
});

// Resend verification code
exports.resendCode = asyncHandler(async (req, res) => {
  const result = await AuthService.resendCode(req.body);
  return success(res, result.message);
});

// Forgot password - send reset code
exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body);
  return success(res, result.message);
});

// Reset password using reset code
exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.resetPassword(req.body);
  return success(res, result.message);
});

// Logout user - clear auth token cookie
exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  });
  return success(res, "Logged out successfully.");
});

// Google social login
exports.googleLogin = asyncHandler(async (req, res) => {
  const { customer } = await AuthService.googleLogin(req.body.idToken, req);
  return sendTokenResponse(customer, 200, res, req.originalUrl);
});

// Facebook social login
exports.facebookLogin = asyncHandler(async (req, res) => {
  const { accessToken } = req.body;
  const { customer } = await AuthService.facebookLogin(accessToken, req);
  return sendTokenResponse(customer, 200, res, req.originalUrl);
});

// Refresh or validate JWT token
exports.refreshOrValidateToken = asyncHandler(async (req, res) => {
  const result = await AuthService.refreshOrValidateToken(req);

  if (result.tokenRefreshed) {
    return sendTokenResponse(result.customer, 200, res, req.originalUrl);
  }

  return success(res, "Token is valid", {
    data: result.customer,
  });
});
