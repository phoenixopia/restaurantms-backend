const ProfileService = require("../../services/admin/profile_picture_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await ProfileService.getProfile(req.user);
  return success(res, "Profile fetched successfully", profile);
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
