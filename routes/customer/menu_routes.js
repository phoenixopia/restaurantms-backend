const express = require("express");
const MenuController = require("../../controllers/admin/menu_controller");

const router = express.Router();

router.get("/:restaurantId", MenuController.getActiveMenus);

module.exports = router;
