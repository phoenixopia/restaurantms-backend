const express = require("express");
const PermissionController = require("../../controllers/admin/permission_controller");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { protect } = require("../../middleware/protect");

const router = express.Router();

// List all permissions
router.get(
  "/",
  protect,
  authorize("super_admin"),
  permissionCheck("view_permissions"),
  PermissionController.listPermissions
);

// List permissions for a specific role
router.get(
  "/role/:roleName",
  protect,
  authorize("super_admin"),
  permissionCheck("view_permissions_for_role"),
  PermissionController.listPermissionsForRole
);

// Get permission by ID
router.get(
  "/:id",
  protect,
  authorize("super_admin"),
  permissionCheck("view_permission"),
  PermissionController.getPermissionById
);

// Create a new permission
router.post(
  "/",
  protect,
  authorize("super_admin"),
  permissionCheck("create_permission"),
  PermissionController.createPermission
);

// Update a permission
router.put(
  "/:id",
  protect,
  authorize("super_admin"),
  permissionCheck("update_permission"),
  PermissionController.updatePermission
);

// Delete a permission
router.delete(
  "/:id",
  protect,
  authorize("super_admin"),
  permissionCheck("delete_permission"),
  PermissionController.deletePermission
);

// Grant permissions to a role
router.post(
  "/grant",
  protect,
  authorize("super_admin"),
  permissionCheck("grant_permissions"),
  PermissionController.grantPermissionsToRole
);

// Revoke permissions from a role
router.post(
  "/revoke",
  protect,
  authorize("super_admin"),
  permissionCheck("revoke_permissions"),
  PermissionController.revokePermissionsFromRole
);

// Bulk delete permissions
router.post(
  "/bulk-delete",
  protect,
  authorize("super_admin"),
  permissionCheck("delete_permission"),
  PermissionController.bulkDeletePermissions
);

// Grant permission directly to a user
router.post(
  "/users/:userId/permissions/grant",
  protect,
  authorize("restaurant_admin", "super_admin"),
  permissionCheck("grant_user_permission"),
  PermissionController.grantUserPermission
);

// Revoke permission directly from a user
router.post(
  "/users/:userId/permissions/revoke",
  protect,
  authorize("super_admin", "restaurant_admin"),
  permissionCheck("revoke_user_permission"),
  PermissionController.revokeUserPermission
);

module.exports = router;

// permission name that will be added in the seed file
/*
view_permissions — to view/list permissions
create_permission — to create new permissions
update_permission — to update existing permissions
delete_permission — to delete a permission
bulk_delete_permissions — to delete multiple permissions at once
grant_permission_to_user — to grant permissions to a user
revoke_permission_from_user — to revoke permissions from a user
grant_permission_to_role — to grant permissions to a role
revoke_permission_from_role — to revoke permissions from a role
*/
