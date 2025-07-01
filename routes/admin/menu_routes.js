const express = require("express");

const MenuController = require("../../controllers/menu_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const ValidateUploadedFiles = require("../../middleware/validateUploadedFiles");
const Upload = require("../../middleware/uploads");

const router = express.Router();

// ======================== Menu
router.get(
  "/list",
  protect,
  permissionCheck("view_menu"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.getMenu
);

router.post(
  "/create",
  protect,
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.createMenu
);

router.put(
  "/update/:id",
  protect,
  permissionCheck("update_menu"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.updateMenu
);

router.delete(
  "/delete/:id",
  protect,
  permissionCheck("delete_menu"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.deleteMenu
);

router.patch(
  "/toggle-activation/:id",
  protect,
  permissionCheck("toggle_menu_activation"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.toggleMenuActivation
);

// ======================== Menu Category

router.get(
  "/menu-category/list",
  protect,
  permissionCheck("view_menu_categories"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.listMenuCategories
);

router.get(
  "/menu-category/byID/:id",
  protect,
  permissionCheck("view_menu_categories"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.getMenuCategory
);

router.get("menu-category-tags/list", protect, MenuController.listCategoryTags);

router.post(
  "/menu-category/create",
  protect,
  permissionCheck("create_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.createMenuCategory
);

router.put(
  "/menu-category/update/:id",
  protect,
  permissionCheck("update_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.updateMenuCategory
);

router.delete(
  "/menu-category/delete/:id",
  protect,
  permissionCheck("delete_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.deleteMenuCategory
);

router.patch(
  "/menu-category/toggle-activation/:id",
  protect,
  permissionCheck("toggle_menu_category_activation"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.toggleMenuCategoryActivation
);

// ========================= Menu Items

router.post(
  "/menu-item/create",
  protect,
  permissionCheck("create_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  ValidateUploadedFiles.validateUploadedFiles("menuItem"),
  Upload.uploadMenuItemImage,
  MenuController.createMenuItem
);

router.put(
  "/menu-item/update/:id",
  protect,
  permissionCheck("update_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  ValidateUploadedFiles.validateUploadedFiles("menuItem"),
  Upload.uploadMenuItemImage,
  MenuController.updateMenuItem
);

router.delete(
  "/menu-item/delete/:id",
  protect,
  permissionCheck("delete_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.deleteMenuItem
);

router.patch(
  "/menu-item/toggle-seasonal/:id",
  protect,
  permissionCheck("toggle_seasonal"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.toggleSeasonal
);

router.get(
  "/menu-item/byID/:id",
  protect,
  permissionCheck("view_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.getSingleMenuItem
);

router.get(
  "/menu-item/list/:id",
  protect,
  permissionCheck("view_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.listMenuItemsWithRestaurant
);

module.exports = router;
