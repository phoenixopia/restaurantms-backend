const express = require("express");

const MenuItemController = require("../../controllers/admin/menuItem_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const validateUploadedFiles = require("../../middleware/validateUploadedFiles");
const { uploadMenuItemImage } = require("../../middleware/uploads");

const router = express.Router();

// user side
router.get("/public", MenuItemController.listActiveMenuItems);

// admin side

// List Menu Items
router.post(
  "/",
  protect,
  permissionCheck("view_menu_items"),
  RestaurantStatus.checkRestaurantStatus,
  MenuItemController.listMenuItems
);

// Search Menu Items
router.post(
  "/search",
  protect,
  permissionCheck("view_menu_items"),
  RestaurantStatus.checkRestaurantStatus,
  MenuItemController.searchMenuItems
);

// Create Menu Item
router.post(
  "/create",
  protect,
  permissionCheck("create_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  uploadMenuItemImage,
  validateUploadedFiles("menuItem"),
  MenuItemController.createMenuItem
);

// Update Menu Item
router.put(
  "/:id",
  protect,
  permissionCheck("update_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  uploadMenuItemImage,
  validateUploadedFiles("menuItem"),
  MenuItemController.updateMenuItem
);

// Soft Delete Menu Item
router.delete(
  "/:id",
  protect,
  permissionCheck("delete_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuItemController.deleteMenuItem
);

// Toggle Seasonal
router.patch(
  "/toggle-seasonal/:id",
  protect,
  permissionCheck("toggle_seasonal"),
  RestaurantStatus.checkRestaurantStatus,
  MenuItemController.toggleSeasonal
);

// Get Single Menu Item
router.get(
  "/:id",
  protect,
  permissionCheck("view_menu_item"),
  RestaurantStatus.checkRestaurantStatus,
  MenuItemController.getSingleMenuItem
);

module.exports = router;
