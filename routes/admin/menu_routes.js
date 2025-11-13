const express = require("express");

const MenuController = require("../../controllers/admin/menu_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const ValidateUploadedFiles = require("../../middleware/validateUploadedFiles");
const Upload = require("../../middleware/uploads");
const checkStorageQuota = require("../../middleware/checkStorageCapacity");

const router = express.Router();

// ======================== Menu
router.get(
  "/list-menu",
  protect("user"),
  // permissionCheck("view_menu"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.getMenu
);

router.get(
  "/menu-byID/:id",

  MenuController.getSingleMenu
);

router.post(
  "/create-menu",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.createMenu
);

router.put(
  "/update-menu",
  protect("user"),
  // permissionCheck("edit_menuv"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.updateMenu
);

router.delete(
  "/delete-menu",
  protect("user"),
  // permissionCheck("delete_menu"),
  // RestaurantStatus.checkRestaurantStatus,
  MenuController.deleteMenu
);

// ======================== Menu Category

router.get(
  "/list-menu-category",
  protect("user"),
  // permissionCheck("view_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.listMenuCategories
);

router.get(
  "/menu-category-byId/:id",
  protect("user"),
  // permissionCheck("view_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.getMenuCategory
);

router.get(
  "/menu-category-tags/list",
  protect("user"),
  MenuController.listCategoryTags
);

router.post(
  "/create-menu-category",
  protect("user"),
  // permissionCheck("create_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.createMenuCategory
);

router.put(
  "/update-menu-category/:id",
  protect("user"),
  // permissionCheck("edit_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.updateMenuCategory
);

router.delete(
  "/delete-menu-category/:id",
  protect("user"),
  // permissionCheck("delete_menu_category"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.deleteMenuCategory
);

router.patch(
  "/menu-category/toggle-activation/:id",
  protect("user"),
  // permissionCheck("toggle_menu_category_activation"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.toggleMenuCategoryActivation
);

// ========================= Menu Items

router.post(
  "/create-menu-item",
  protect("user"),
  // permissionCheck("create_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.createMenuItem
);

router.put(
  "/upload-image/:id",
  protect("user"),
  // permissionCheck("update_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  Upload.uploadMenuItemImage,
  ValidateUploadedFiles.validateUploadedFiles("menuItem"),
  checkStorageQuota,
  MenuController.uploadImage
);

router.put(
  "/update-menu-item/:id",
  protect("user"),
  // permissionCheck("update_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.updateMenuItem
);

router.delete(
  "/delete-menu-item/:id",
  protect("user"),
  // permissionCheck("delete_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.deleteMenuItem
);

router.patch(
  "/menu-item/toggle-seasonal/:id",
  protect("user"),
  // permissionCheck("toggle_seasonal"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.toggleSeasonal
);

router.patch(
  "/menu-item/toggle-activation/:id",
  protect("user"),
  // permissionCheck("toggle_menu_item_activation"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.toggleMenuItemActivation
);

router.get(
  "/menu-item-byID/:id",
  protect("user"),
  // permissionCheck("view_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.getSingleMenuItem
);

router.get(
  "/list-all-menu-item",
  protect("user"),
  // permissionCheck("view_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.listMenuItemsWithRestaurant
);

router.get('/barcode/:menuId', 
  
  protect("user"),
  authorize("restaurant_admin"),
  // permissionCheck("generate_qr"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.generateBarcode
);

module.exports = router;
