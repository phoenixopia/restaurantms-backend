const express = require("express");
const RoleController = require("../../controllers/admin/role_controller");

const { authorize } = require("../../middleware/authorize");
const { protect } = require("../../middleware/protect");

const router = express.Router();

// Create a new role
router.post("/", protect, authorize("super_admin"), RoleController.createRole);

// Get all roles
router.get("/", protect, authorize("super_admin"), RoleController.listRoles);

// Update a role
router.put(
  "/:id",
  protect,
  authorize("super_admin"),
  RoleController.updateRole
);

// Delete a role
router.delete(
  "/:id",
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

module.exports = router;
