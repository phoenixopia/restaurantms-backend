const express = require("express");
const { protect } = require('../../middleware/protect');
const { authorize } = require('../../middleware/authorize');
const { getAllPermissions, createPermission, updatePermission, getPermissionByRole, getPermissionById } = require("../../controllers/admin/permissionController");

const router = express.Router();

router.get("/", getAllPermissions);
router.get("/role/:id", getPermissionByRole);
router.get("/:id", getPermissionById);
router.post("/", protect, authorize('super-admin'), createPermission);
router.put("/:id", protect, authorize('super-admin'), updatePermission);

module.exports = router;
