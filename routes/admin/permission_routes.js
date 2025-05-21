const express = require("express");
const { verifyToken, isSuperAdmin } = require("../../../middleware/protext");
const {
  listPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} = require("../../../controllers/admin/super-admin/permission_controller");

const router = express.Router();

router.get("/", verifyToken, isSuperAdmin, listPermissions);
router.post("/create", verifyToken, isSuperAdmin, createPermission);
router.patch("/update/:id", verifyToken, isSuperAdmin, updatePermission);
router.delete("/delete/:id", verifyToken, isSuperAdmin, deletePermission);

module.exports = router;
