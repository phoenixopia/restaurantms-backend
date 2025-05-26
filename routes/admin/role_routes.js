const express = require("express");
const { protect } = require('../../middleware/protect');
const { authorize } = require('../../middleware/authorize');
const { getAllRoles, getRoleById, getRolesByUser, createRole, updateRole } = require("../../controllers/admin/roleController");

const router = express.Router();

router.get("/", getAllRoles);
router.get("/:id", getRoleById);
router.get("/user", protect, authorize('super-admin', "admin"), getRolesByUser);
router.post("/", protect, authorize('super-admin', "admin"), createRole);
router.put("/", protect, authorize('super-admin', "admin"), updateRole);


module.exports = router;
