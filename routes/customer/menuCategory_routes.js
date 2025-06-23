const express = require("express");

const MenuCategoryController = require("../../controllers/admin/menuCategory_controller");

const router = express.Router();

router.get("/public/:menuId", MenuCategoryController.listActiveMenuCategories);

module.exports = router;
