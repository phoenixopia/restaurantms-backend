const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");
const validateUploadedFiles = require("../../middleware/validateUploadedFiles");
const {uploadRestaurantFiles} = require("../../middleware/uploads");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

const router = express.Router();

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
  validateUploadedFiles("restaurant"),
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
  validateUploadedFiles("restaurant"),
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
