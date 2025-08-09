const express = require("express");
const rbacController = require("../../controllers/admin/rbac_controller");
const validateRequest = require("../../middleware/validateRequest");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

const router = express.Router();

// ================= RoleTag
router.post(
  "/create-role-tag",
  protect("user"),
  permissionCheck("create_role_tag"),
  rbacController.createRoleTag
);

router.put(
  "/update-role-tag/:id",
  protect("user"),
  permissionCheck("update_role_tag"),
  rbacController.updateRoleTag
);

router.get(
  "/role-tag-byId/:id",
  protect("user"),
  rbacController.getRoleTagById
);

router.get(
  "/all-role-tags",
  protect("user"),
  permissionCheck("view_role_tag"),
  rbacController.getAllRoleTag
);

router.delete(
  "/delete-role-tag/:id",
  protect("user"),
  permissionCheck("delete_role_tag"),
  rbacController.deleteRoleTag
);

// ================= ROLE

router.post(
  "/create-role",
  protect("user"),
  permissionCheck("create_role"),
  rbacController.createRole
);

router.put(
  "/update-role/:id",
  protect("user"),
  permissionCheck("update_role"),
  rbacController.updateRole
);

router.get(
  "/all-roles",
  protect("user"),
  permissionCheck("view_role"),
  rbacController.getAllRoles
);

router.get(
  "/roles/:id",
  protect("user"),
  permissionCheck("view_role"),
  rbacController.getRoleById
);

// ================= PERMISSION
router.post(
  "/create-permission",
  protect("user"),
  permissionCheck("create_permission"),
  rbacController.createPermission
);

router.put(
  "/update-permission/:id",
  protect("user"),
  permissionCheck("update_permission"),
  rbacController.updatePermission
);

router.get(
  "/all-permission",
  protect("user"),
  permissionCheck("view_permission"),
  rbacController.getAllPermissions
);

router.get(
  "/permission-byId/:id",
  protect("user"),
  permissionCheck("view_permission"),
  rbacController.getPermissionById
);

router.get(
  "/users/:userId/permissions",
  protect("user"),
  rbacController.getUserPermissions
);

module.exports = router;
