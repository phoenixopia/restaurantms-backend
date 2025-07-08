const express = require("express");
const rbacController = require("../../controllers/admin/rbac_controller");
const validateRequest = require("../../middleware/validateRequest");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");

const {
  createRoleValidator,
  updateRoleValidator,
  createPermissionValidator,
  updatePermissionValidator,
  grantOrRevokePermissionToRoleValidator,
  grantOrRevokePermissionToUserValidator,
} = require("../../validators/rbac_validator");

const router = express.Router();

// ================= ROLE
router.post(
  "/create-role",
  protect("user"),
  authorize("super_admin"),
  createRoleValidator,
  validateRequest,
  rbacController.createRole
);

router.put(
  "/update-role/:id",
  protect("user"),
  authorize("super_admin"),
  updateRoleValidator,
  validateRequest,
  rbacController.updateRole
);

router.get(
  "/roles",
  protect("user"),
  authorize("super_admin"),
  rbacController.getAllRoles
);

router.get(
  "/roles/:id",
  protect("user"),
  authorize("super_admin"),
  rbacController.getRoleById
);

router.get(
  "/my-role",
  protect("user"),
  rbacController.getMyRoleWithPermissions
);

// retruns role info with permissions
router.get(
  "/roles/:id/permissions",
  protect("user"),
  authorize("super_admin", "restaurant_admin"),
  rbacController.getRoleWithPermissions
);

// grant or revoke permissions to role
router.post(
  "/roles/:roleId/permissions/toggle",
  protect("user"),
  authorize("super_admin"),
  grantOrRevokePermissionToRoleValidator,
  validateRequest,
  rbacController.togglePermissionForRole
);

// ================= PERMISSION
router.post(
  "/create-permission",
  protect("user"),
  authorize("super_admin"),
  createPermissionValidator,
  validateRequest,
  rbacController.createPermission
);

router.put(
  "/update-permission/:id",
  protect("user"),
  authorize("super_admin"),
  updatePermissionValidator,
  validateRequest,
  rbacController.updatePermission
);

router.get(
  "/permissions",
  protect("user"),
  authorize("super_admin"),
  rbacController.getAllPermissions
);

router.get(
  "/permissions/:id",
  protect("user"),
  authorize("super_admin"),
  rbacController.getPermissionById
);

// USER-ROLE & PERMISSION

// grant or revoke permissions to user by restaurant admins
router.post(
  "/users/:userId/permissions/toggle",
  protect("user"),
  authorize("restaurant_admin"),
  grantOrRevokePermissionToUserValidator,
  validateRequest,
  rbacController.togglePermissionToUser
);

router.get(
  "/users/:userId/permissions",
  protect("user"),
  rbacController.getUserPermissions
);

module.exports = router;
