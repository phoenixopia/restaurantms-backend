const asyncHandler = require("../../middleware/asyncHandler");
const AuthService = require("../../services/admin/auth_service");
const { success } = require("../../utils/apiResponse");
const { sendTokenResponse } = require("../../utils/sendTokenResponse");

// exports.register = asyncHandler(async (req, res) => {
//   const result = await AuthService.register(req.body);
//   return success(res, result.message, null, 201);
// });

exports.login = asyncHandler(async (req, res) => {
  const { user, requiresPasswordChange, message } = await AuthService.login({
    ...req.body,
  });

  if (requiresPasswordChange) {
    return success(res, message, {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
      },
      requiresPasswordChange: true,
    });
  }

  return sendTokenResponse(user, 200, res);
});

exports.changeTemporaryPassword = asyncHandler(async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    throwError("User ID and new password are required", 400);
  }

  const user = await AuthService.changeTemporaryPassword({
    userId,
    newPassword,
  });

  return sendTokenResponse(user.user, 200, res);
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  });
  return success(res, "Logged out successfully.");
});

exports.verifyCode = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyCode(req.body, res);
  if (result) {
    return success(res, result.message, result.data || null);
  }
});

exports.resendCode = asyncHandler(async (req, res) => {
  const result = await AuthService.resendCode(req.body);
  return success(res, result.message);
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body);
  return success(res, result.message);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.resetPassword(req.body);
  return success(res, result.message);
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

// exports.googleLogin = asyncHandler(async (req, res) => {
//   const { user } = await AuthService.googleLogin(req.body.idToken, req);
//   return sendTokenResponse(user, 200, res, req.originalUrl);
// });

// exports.facebookLogin = asyncHandler(async (req, res) => {
//   const { accessToken } = req.body;

//   const { user } = await AuthService.facebookLogin(accessToken, req);
//   return sendTokenResponse(user, 200, res, req.originalUrl);
// });
