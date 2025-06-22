const express = require("express");
const MenuController = require("../../controllers/admin/menu_controller");

const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");

const router = express.Router();

// for app users
router.get("/:restaurantId", MenuController.getActiveMenus);

// for restaurant admin and staff
router.get(
  "/",
  protect,
  authorize("restaurant_admin", "staff"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.listMenus
);
router.get(
  "/:id",
  protect,
  authorize("restaurant_admin", "staff"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.getMenuById
);

router.post(
  "/create-menu",
  protect,
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  MenuController.createMenu
);

router.put(
  "/update-menu/:id",
  protect,
  permissionCheck("update_menu"),
  RestaurantStatus.checkStatusofRestaurant,
  MenuController.updateMenu
);

router.delete(
  "/delete-menu/:id",
  protect,
  permissionCheck("delete_menu"),
  RestaurantStatus.checkStatusofRestaurant,
  MenuController.deleteMenu
);

router.patch(
  "/:id/toggle-activation",
  protect,
  permissionCheck("toggle_menu_activation"),
  RestaurantStatus.checkStatusofRestaurant,
  MenuController.toggleMenuActivation
);

module.exports = router;
