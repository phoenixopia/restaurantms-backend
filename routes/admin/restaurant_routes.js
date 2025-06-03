const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");
const validateFiles = require("../../middleware/uploadMiddleware");
const uploadRestaurantFiles = require("../../config/cloudinaryRestaurant");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

const router = express.Router();

// Public access
router.get("/all-restaurants", RestaurantController.getAllRestaurants);
router.get("/name/:name", RestaurantController.getRestaurantByName);
router.get("/nearby", RestaurantController.getNearbyRestaurants);

// Protected routes for restaurant admin
router.get(
  "/owned-restaurants",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.getRestaurant
);

// Register restaurant with file upload + validation
router.post(
  "/register",
  protect,
  authorize("restaurant_admin"),
  // permissionCheck("register_restaurant"),
  uploadRestaurantFiles,
  validateFiles,
  RestaurantController.registerRestaurant
);

// Update restaurant with file upload + validation
router.put(
  "/update/:id",
  protect,
  authorize("restaurant_admin"),
  // permissionCheck("update_restaurant"),
  RestaurantStatus.checkStatusofRestaurant,
  uploadRestaurantFiles,
  validateFiles,
  RestaurantController.updateRestaurant
);

// Delete restaurant
router.delete(
  "/delete/:id",
  protect,
  permissionCheck("delete_restaurant"),
  RestaurantController.deleteRestaurant
);

router.get(
  "/registered-restaurants",
  protect,
  authorize("super_admin"),
  RestaurantController.getAllRestaurantsRegistered
);

router.put(
  "/change-status/:id",
  protect,
  authorize("super_admin"),
  // permissionCheck("change_restaurant_status"),
  RestaurantController.changeRestaurantStatus
);

module.exports = router;

/*
register_restaurant
update_restaurant
delete_restaurant
change_restaurant_status
*/
