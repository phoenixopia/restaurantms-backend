const express = require("express");
const RoleController = require("../../controllers/admin/role_controller");

const { authorize } = require("../../middleware/authorize");
const { protect } = require("../../middleware/protect");

const router = express.Router();

// Create a new role
router.post(
  "/create-role",
  protect,
  authorize("super_admin"),
  RoleController.createRole
);

// Get all roles
router.get(
  "/list-all-roles",
  protect,
  authorize("super_admin"),
  RoleController.listRoles
);

// Get a specific role by ID with granted permissions
router.get(
  "/get-role/:id",
  protect,
  authorize("super_admin", "restaurant_admin"),
  RoleController.getRole
);

// Update a role
router.put(
  "update/:id",
  protect,
  authorize("super_admin"),
  RoleController.updateRole
);

// Delete a role
router.delete(
  "delete/:id",
  protect,
  authorize("super_admin"),
  RoleController.deleteRole
);

// Assign or update permissions for a role (roleName in body)
router.post(
  "/assign-permissions",
  protect,
  authorize("super_admin"),
  RoleController.assignPermissionsToRole
);

// Remove a permission from a role (roleName and permissionId in body)
router.post(
  "/remove-permission",
  protect,
  authorize("super_admin"),
  RoleController.removePermissionFromRole
);
// Assign role to user
router.post(
  "/assign-role",
  protect,
  authorize("super_admin"),
  RoleController.assignRoleToUser
);

// Remove role from user
router.post(
  "/remove-role",
  protect,
  authorize("super_admin"),
  RoleController.removeRoleFromUser
);

module.exports = router;
