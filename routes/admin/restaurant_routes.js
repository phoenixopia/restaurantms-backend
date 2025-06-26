const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");
const validateUploadedFiles = require("../../middleware/validateUploadedFiles");
const { uploadRestaurantFiles } = require("../../middleware/uploads");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const validateRequest = require("../../middleware/validateRequest");
const {
  createRestaurantValidator,
  updateRestaurantValidator,
  deleteRestaurantValidator,
  changeStatusValidator,
} = require("../../validators/restaurant_validator");

const router = express.Router();

// GET /owned-restaurants - restaurant_admin's owned restaurant
router.get(
  "/owned-restaurants",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.getRestaurant
);

// GET /search - public-facing unified search (by name, nearby, etc.)
router.get("/search", RestaurantController.searchRestaurants);

// POST /register - register new restaurant
router.post(
  "/register",
  protect,
  authorize("restaurant_admin"),
  // permissionCheck("register_restaurant"),
  uploadRestaurantFiles,
  validateUploadedFiles("restaurant"),
  createRestaurantValidator,
  validateRequest,
  RestaurantController.registerRestaurant
);

// PUT /update/:id - update restaurant
router.put(
  "/update/:id",
  protect,
  authorize("restaurant_admin"),
  // permissionCheck("update_restaurant"),
  RestaurantStatus.checkStatusofRestaurant,
  uploadRestaurantFiles,
  validateUploadedFiles("restaurant"),
  updateRestaurantValidator,
  validateRequest,
  RestaurantController.updateRestaurant
);

// DELETE /delete/:id - delete restaurant
router.delete(
  "/delete/:id",
  protect,
  authorize("restaurant_admin"),
  permissionCheck("delete_restaurant"),
  deleteRestaurantValidator,
  validateRequest,
  RestaurantController.deleteRestaurant
);

// GET all restaurants
router.get("/restaurants", RestaurantController.getAllRestaurants);

// PUT /change-status/:id - super_admin: change restaurant status
router.put(
  "/change-status/:id",
  protect,
  authorize("super_admin"),
  // permissionCheck("change_restaurant_status"),
  changeStatusValidator,
  validateRequest,
  RestaurantController.changeRestaurantStatus
);

module.exports = router;
