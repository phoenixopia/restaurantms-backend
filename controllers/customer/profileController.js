const asyncHandler = require("../../utils/asyncHandler");
const ProfileService = require("../../services/customer/profile_service");
const { success } = require("../../utils/apiResponse");

exports.updateAddress = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const customerId = req.user.id;
  const result = await ProfileService.updateAddress(customerId, type, req.body);

  return success(res, result.message, result.data, 200);
});

exports.updateMultipleAddresses = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const result = await ProfileService.updateMultipleAddresses(
    customerId,
    req.body
  );
  return success(res, result.message, result.data, 200);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const result = await ProfileService.updateProfile(
    req.user.id,
    {
      ...req.body,
      profile: req.file?.filename,
    },
    req.file ? [req.file] : []
  );

  return success(res, result.message, result.data, 200);
});
