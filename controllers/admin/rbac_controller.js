const RbacService = require("../../services/admin/rbac_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");
const throwError = require("../../utils/throwError");

// ==================== Role Tag

exports.createRoleTag = asyncHandler(async (req, res) => {
  const roleTag = await RbacService.createRoleTag(req.body, req.user);
  return success(res, "Role tag created successfully", roleTag, 201);
});

exports.updateRoleTag = asyncHandler(async (req, res) => {
  const updatedRoleTag = await RbacService.updateRoleTag(
    req.params.id,
    req.body,
    req.user
  );
  return success(res, "Role tag updated successfully", updatedRoleTag);
});

exports.getRoleTagById = asyncHandler(async (req, res) => {
  const roleTagWithRoles = await RbacService.getRoleTagByIdWithRoles(
    req.params.id
  );
  return success(
    res,
    "Role tag and roles fetched successfully",
    roleTagWithRoles
  );
});

exports.getAllRoleTag = asyncHandler(async (req, res) => {
  const data = await RbacService.getAllRoleTags();
  return success(res, "Role tags fetched successfully", data);
});

exports.deleteRoleTag = asyncHandler(async (req, res) => {
  await RbacService.deleteRoleTag(req.params.id, req.user);
  return success(res, "Role tag deleted successfully");
});

//====================== ROLE

exports.createRole = asyncHandler(async (req, res) => {
  const role = await RbacService.createRole(req.user, req.body);
  return success(res, "Role created successfully", role, 201);
});

exports.updateRole = asyncHandler(async (req, res) => {
  await RbacService.updateRole(req.params.id, req.user, req.body);
  return success(res, "Role updated successfully");
});

exports.getAllRoles = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;
  const roles = await RbacService.getAllRoles(req.user, { limit, offset });

  return success(res, "Roles fetched successfully", roles);
});

exports.getRoleById = asyncHandler(async (req, res) => {
  const role = await RbacService.getRoleById(req.params.id, req.user);
  return success(res, "Role fetched successfully", role);
});

exports.deleteRole = asyncHandler(async (req, res) => {
  await RbacService.deleteRole(req.params.id, req.user);
  return success(res, "Role deleted successfully");
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

exports.addPermissionsToRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { permissionIds } = req.body;

  const result = await RbacService.addPermissionsToRole(roleId, permissionIds);

  return success(res, "Permissions added to role successfully", result);
});

exports.removePermissionsFromRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { permissionIds } = req.body;

  const result = await RbacService.removePermissionsFromRole(
    roleId,
    permissionIds
  );

  return success(res, "Permissions removed from role successfully", result);
});

// USER-PERMISSION

exports.getUserPermissions = asyncHandler(async (req, res) => {
  const permissions = await RbacService.getUserRoleWithPermissions(
    req.params.userId
  );
  return success(res, "User permissions fetched successfully", permissions);
});

exports.getMyOwnRoleAndPermission = asyncHandler(async (req, res) => {
  const data = await RbacService.getMyOwn(req.user.id);
  return success(res, "My role and permissions fetched successfully", data);
});
