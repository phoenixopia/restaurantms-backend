const express = require("express");
const PermissionController = require("../../controllers/admin/permission_controller");

const router = express.Router();

router.get("/", PermissionController.listPermissions);
router.post("/", PermissionController.createPermission);
router.put("/:id", PermissionController.updatePermission);
router.delete("/:id", PermissionController.deletePermission);
router.post("/grant", PermissionController.grantPermissionsToRole);
router.post("/revoke", PermissionController.revokePermissionsFromRole);

module.exports = router;
