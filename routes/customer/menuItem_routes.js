const express = require("express");

const MenuItemController = require("../../controllers/admin/menuItem_controller");

const router = express.Router();

router.get("/public", MenuItemController.listActiveMenuItems);

module.exports = router;
