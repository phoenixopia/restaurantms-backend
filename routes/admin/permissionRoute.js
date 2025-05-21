const express = require("express");
const { isAuthenticated, authorize } = require("../../middleware/auth");
const { getAllPermissions, createPermission, updatePermission, getPermissionByRole, getPermissionById } = require("../../controllers/admin/permissionController");

const router = express.Router();

router.get("/", getAllPermissions);
router.get("/role/:id", getPermissionByRole);
router.get("/:id", getPermissionById);
router.post("/", isAuthenticated, authorize('super-admin'), createPermission);
router.put("/:id", isAuthenticated, authorize('super-admin'), updatePermission);

module.exports = router;
