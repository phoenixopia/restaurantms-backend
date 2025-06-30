const UserService = require("../services/manageUser_service");
const RbacService = require("../services/rbac_service");
const asyncHandler = require("../middleware/asyncHandler");
const { success } = require("../utils/apiResponse");

exports.createUser = asyncHandler(async (req, res) => {
  const user = await UserService.createUser(req.user.id, req.body);
  return success(res, "User created successfully", user, 201);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  await UserService.deleteUser(req.params.id);
  return success(res, "User deleted successfully");
});

exports.getCreatedUsers = asyncHandler(async (req, res) => {
  const users = await RbacService.getCreatedUsers(req.user.id);
  return success(res, "Created users retrieved successfully", users);
});

exports.getCreatedUserById = asyncHandler(async (req, res) => {
  const user = await UserService.getCreatedUserById(req.user.id, req.params.id);
  return success(res, "User fetched successfully", user);
});
