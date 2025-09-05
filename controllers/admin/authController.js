const asyncHandler = require("../../utils/asyncHandler");
const AuthService = require("../../services/admin/auth_service");
const { success } = require("../../utils/apiResponse");
const { sendTokenResponse } = require("../../utils/sendTokenResponse");
const throwError = require("../../utils/throwError");

exports.login = asyncHandler(async (req, res) => {
  const { user, requiresPasswordChange, message } = await AuthService.login({
    ...req.body,
  });

  return sendTokenResponse(
    user,
    200,
    res,
    req.originalUrl,
    requiresPasswordChange
  );
});

exports.changeTemporaryPassword = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const { newPassword } = req.body;

  if (!newPassword) {
    throwError("New Password are required", 400);
  }

  const user = await AuthService.changeTemporaryPassword({
    userId,
    newPassword,
  });

  return sendTokenResponse(user, 200, res);
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  });
  return success(res, "Logged out successfully.");
});

exports.refreshOrValidateToken = asyncHandler(async (req, res) => {
  const result = await AuthService.refreshOrValidateToken(req);

  if (result.tokenRefreshed) {
    return sendTokenResponse(result.user, 200, res);
  }

  return success(res, "Token is valid", {
    data: result.user,
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { emailOrPhone, signupMethod } = req.body;
  const result = await AuthService.forgotPassword({
    emailOrPhone,
    signupMethod,
  });

  return success(res, result.message);
});

exports.resendCode = asyncHandler(async (req, res) => {
  const result = await AuthService.resendCode(req.body);
  return success(res, result.message);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.resetPassword(req.body);
  return success(res, result.message);
});

exports.verifyCode = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyCode(req.body);
  if (result) {
    return success(res, result.message, result.data || null);
  }
});
