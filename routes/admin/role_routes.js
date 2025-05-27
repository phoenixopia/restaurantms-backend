const express = require("express");
const RoleController = require("../../controllers/admin/role_controller");

const router = express.Router();

// Create a new role
router.post("/", RoleController.createRole);

// Get all roles
router.get("/", RoleController.listRoles);

// Update a role
router.put("/:id", RoleController.updateRole);

// Delete a role
router.delete("/:id", RoleController.deleteRole);

module.exports = router;
