const express = require("express");
const { isAuthenticated, authorize } = require("../../middleware/auth");
const { getAllRoles, getRoleById, getRolesByUser, createRole, updateRole } = require("../../controllers/admin/roleController");

const router = express.Router();

router.get("/", getAllRoles);
router.get("/:id", getRoleById);
router.get("/user", isAuthenticated, authorize('super-admin', "admin"), getRolesByUser);
router.post("/", isAuthenticated, authorize('super-admin', "admin"), createRole);
router.put("/", isAuthenticated, authorize('super-admin', "admin"), updateRole);


module.exports = router;
