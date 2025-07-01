const express = require("express");
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');
const { getAllPermissions, createPermission, updatePermission, getPermissionByRole, getPermissionById } = require("../controllers/permissionController");

const router = express.Router();

router.get("/", getAllPermissions);
router.get("/role/:id", getPermissionByRole);
router.get("/:id", getPermissionById);
router.post("/", protect, authorize('super_admin'), createPermission);
router.put("/:id", protect, authorize('super_admin'), updatePermission);

module.exports = router;
