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

router.post(
  "/create-role",
  protect,
  authorize("super_admin"),
  createRoleValidator,
  validateRequest,
  rbacController.createRole
);

router.put(
  "/update-role/:id",
  protect,
  authorize("super_admin"),
  updateRoleValidator,
  validateRequest,
  rbacController.updateRole
);

router.get(
  "/roles",
  protect,
  authorize("super_admin"),
  rbacController.getAllRoles
);

router.get(
  "/roles/:id",
  protect,
  authorize("super_admin"),
  rbacController.getRoleById
);

// retruns role info with permissions
router.get(
  "/roles/:id/permissions",
  protect,
  authorize("super_admin"),
  rbacController.getRoleWithPermissions
);

// returns only permissions granted to the role( only permissions)
router.get(
  "/roles/:roleId/only-permissions",
  protect,
  authorize("super_admin"),
  rbacController.getRolePermissions
);

router.post(
  "/roles/:roleId/permissions/grant",
  protect,
  authorize("super_admin"),
  grantOrRevokePermissionToRoleValidator,
  validateRequest,
  rbacController.grantPermissionToRole
);

router.post(
  "/roles/:roleId/permissions/revoke",
  protect,
  authorize("super_admin"),
  grantOrRevokePermissionToRoleValidator,
  validateRequest,
  rbacController.revokePermissionFromRole
);

// PERMISSION
router.post(
  "/create-permission",
  protect,
  authorize("super_admin"),
  createPermissionValidator,
  validateRequest,
  rbacController.createPermission
);

router.put(
  "/update-permission/:id",
  protect,
  authorize("super_admin"),
  updatePermissionValidator,
  validateRequest,
  rbacController.updatePermission
);

router.get(
  "/permissions",
  protect,
  authorize("super_admin"),
  rbacController.getAllPermissions
);

router.get(
  "/permissions/:id",
  protect,
  authorize("super_admin"),
  rbacController.getPermissionById
);

// USER-ROLE & PERMISSION

router.post(
  "/users/:userId/permissions/grant",
  protect,
  authorize("restaurant_admin"),
  grantOrRevokePermissionToUserValidator,
  validateRequest,
  rbacController.grantPermissionToUser
);

router.post(
  "/users/:userId/permissions/revoke",
  protect,
  authorize("restaurant_admin"),
  grantOrRevokePermissionToUserValidator,
  validateRequest,
  rbacController.revokePermissionFromUser
);

router.get(
  "/users/:userId/permissions",
  protect,
  rbacController.getUserPermissions
);

module.exports = router;
