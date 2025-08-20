const UserService = require("../../services/admin/manageUser_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.createRestaurantAdmin = asyncHandler(async (req, res) => {
  const user = await UserService.createRestaurantAdmin(req.user.id, req.body);
  return success(res, "Restaurant admin created successfully", user, 201);
});

exports.createStaff = asyncHandler(async (req, res) => {
  const user = await UserService.createStaff(req.user.id, req.body);
  return success(res, "Staff user created successfully", user, 201);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  await UserService.deleteUser(req.params.id, req.user.id);
  return success(res, "User deleted successfully");
});

exports.getCreatedUserById = asyncHandler(async (req, res) => {
  const user = await UserService.getCreatedUserById(req.user.id, req.params.id);
  return success(res, "User fetched successfully", user);
});

exports.getCreatedUsers = asyncHandler(async (req, res) => {
  const users = await UserService.getAllCreatedUsers(req.user.id, req.query);
  return success(res, "Created users retrieved successfully", users);
});

exports.assignUserToBranch = asyncHandler(async (req, res) => {
  const { userId, branchId } = req.body;
  const result = await UserService.assignUserToBranch(
    userId,
    branchId,
    req.user
  );
  return success(res, result.message, result);
});

exports.assignRestaurantAdmin = asyncHandler(async (req, res) => {
  const { userId, restaurantId } = req.body;
  const result = await UserService.assignUserToRestaurant(
    userId,
    restaurantId,
    req.user
  );
  return success(res, result.message, result);
});

exports.assignBranchManager = asyncHandler(async (req, res) => {
  const { userId, branchId } = req.body;
  const result = await UserService.assignBranchManager(
    userId,
    branchId,
    req.user
  );
  return success(res, result.message, result);
});

exports.removeBranchManager = asyncHandler(async (req, res) => {
  const { branchId } = req.body;

  const result = await UserService.removeBranchManager(branchId, req.user);

  return success(res, result.message, result);
});
