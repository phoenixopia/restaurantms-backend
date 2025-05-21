const express = require("express");
const router = express.Router();
const menuCategoryController = require("../../controllers/admin/menu_category.controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const checkPermission = require("../../middleware/checkPermission");

// middlewares will be added here
router.post("/", menuCategoryController.createCategory);
router.get("/", menuCategoryController.getAllCategories);
router.get("/branch/:branch_id", menuCategoryController.getCategoriesByBranch);
router.get("/:id", menuCategoryController.getCategoryById);
router.put("/:id", menuCategoryController.updateCategory);
router.delete("/:id", menuCategoryController.deleteCategory);

module.exports = router;
