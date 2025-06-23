const express = require("express");

const MenuCategoryController = require("../../controllers/admin/menuCategory_controller");
const { protect } = require("../../middleware/protect");
// const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const validateUploadedFiles = require("../../middleware/validateUploadedFiles");
const { uploadCategoryImage } = require("../../middleware/uploads");

const router = express.Router();

// admin side
router.post(
  "/",
  protect,
  permissionCheck("view_menu_categories"),
  RestaurantStatus.checkRestaurantStatus,
  MenuCategoryController.listMenuCategories
);

router.post(
  "/search",
  protect,
  permissionCheck("view_menu_categories"),
  RestaurantStatus.checkRestaurantStatus,
  MenuCategoryController.listMenuCategories
);

router.post(
  "/",
  protect,
  permissionCheck("create_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  uploadCategoryImage,
  validateUploadedFiles("category"),
  MenuCategoryController.createMenuCategory
);

router.put(
  "/:id",
  protect,
  permissionCheck("update_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  uploadCategoryImage,
  validateUploadedFiles("category"),
  MenuCategoryController.updateMenuCategory
);

router.delete(
  "/:id",
  protect,
  permissionCheck("delete_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuCategoryController.deleteMenuCategory
);

router.patch(
  "/toggle-activation/:id",
  protect,
  permissionCheck("activate_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuCategoryController.toggleMenuCategoryActivation
);

module.exports = router;
