const express = require("express");
const { verifyToken, isSuperAdmin } = require("../../../middleware/protext");
const {
  listPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} = require("../../../controllers/admin/super-admin/permission_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const checkPermission = require("../../middleware/checkPermission");

const router = express.Router();

// middlewares will be added .... this is for (authorize(restaurant_admin))
router.get("/", listPermissions);
router.post("/create", createPermission);
router.patch("/update/:id", updatePermission);
router.delete("/delete/:id", deletePermission);

module.exports = router;
