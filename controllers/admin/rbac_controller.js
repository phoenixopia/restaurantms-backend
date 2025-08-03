const RbacService = require("../../services/admin/rbac_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

// ROLE

exports.createRole = asyncHandler(async (req, res) => {
  const role = await RbacService.createRole(req.body);
  return success(res, "Role created successfully", role, 201);
});

exports.updateRole = asyncHandler(async (req, res) => {
  await RbacService.updateRole(req.params.id, req.body);
  return success(res, "Role updated successfully");
});

exports.getAllRoles = asyncHandler(async (req, res) => {
  const roles = await RbacService.getAllRoles(req.query);
  return success(res, "Roles fetched successfully", roles);
});

exports.getRoleById = asyncHandler(async (req, res) => {
  const role = await RbacService.getRoleById(req.params.id);
  return success(res, "Role fetched successfully", role);
});

exports.getMyRoleWithPermissions = asyncHandler(async (req, res) => {
  const role = await RbacService.getMyOwnRolePermission(req.user.id);
  return success(res, "Your role and granted permissions fetched", role);
});

exports.getRoleWithPermissions = asyncHandler(async (req, res) => {
  const data = await RbacService.getRoleWithPermissions(
    req.params.id,
    req.query
  );
  return success(res, "Role with permissions fetched successfully", data);
});

// PERMISSION

exports.createPermission = asyncHandler(async (req, res) => {
  const permission = await RbacService.createPermission(req.body);
  return success(res, "Permission created successfully", permission, 201);
});

exports.updatePermission = asyncHandler(async (req, res) => {
  await RbacService.updatePermission(req.params.id, req.body);
  return success(res, "Permission updated successfully");
});

exports.getAllPermissions = asyncHandler(async (req, res) => {
  const permissions = await RbacService.getAllPermissions(req.query);
  return success(res, "Permissions fetched successfully", permissions);
});

exports.getPermissionById = asyncHandler(async (req, res) => {
  const permission = await RbacService.getPermissionById(req.params.id);
  return success(res, "Permission fetched successfully", permission);
});

// ROLE-PERMISSION

exports.togglePermissionForRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { permissionIds } = req.body;

  const result = await RbacService.togglePermissionForRole(
    roleId,
    permissionIds
  );

  return success(res, "Permissions toggled for role successfully", result);
});

// USER-PERMISSION

exports.togglePermissionToUser = asyncHandler(async (req, res) => {
  const result = await RbacService.togglePermissionForUser(
    req.params.userId,
    req.body.permissionIds,
    req.user
  );
  return success(res, "Permissions toggled successfully", result);
});

exports.getUserPermissions = asyncHandler(async (req, res) => {
  const permissions = await RbacService.getUserPermissions(req.params.userId);
  return success(res, "User permissions fetched successfully", permissions);
});
