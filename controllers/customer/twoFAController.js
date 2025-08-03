"use strict";

const TwoFAService = require("../../services/customer/twoFA_service");
const catchAsync = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.setup2FA = catchAsync(async (req, res) => {
  const result = await TwoFAService.setup2FA(req.user);
  return success(
    res,
    "Two-factor authentication setup successful.",
    result,
    200
  );
});
