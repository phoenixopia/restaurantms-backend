const asyncHandler = require("../../utils/asyncHandler");
const ProfileService = require("../../services/customer/profile_service");
const { success } = require("../../utils/apiResponse");



// Get all addresses
exports.getAllAddress = asyncHandler(async (req, res) => {
  const result = await ProfileService.getAllAddress();
  return success(res, result.message, result.data, 200);
});


// Get address by ID 
exports.getAddressById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customerId = req.user.id;
  const result = await ProfileService.getAddressById(customerId, id);

  return success(res, result.message, result.data, 200);
});


// Update a specific address (e.g., home, work)
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

// update profile picture and details 
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
