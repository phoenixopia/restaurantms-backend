const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");
const validateFiles = require("../../middleware/uploadMiddleware");
const uploadRestaurantFiles = require("../../config/cloudinaryRestaurant");
const { protect } = require("../../middleware/protect");

const router = express.Router();

// Public access
router.get("/all-restaurants", RestaurantController.getAllRestaurants);
router.get("/name/:name", RestaurantController.getRestaurantByName);
router.get("/nearby", RestaurantController.getNearbyRestaurants);
router.get("/", RestaurantController.getRestaurant);

// Register restaurant with file upload + validation
router.post(
  "/register",
  protect,
  uploadRestaurantFiles,
  validateFiles,
  RestaurantController.registerRestaurant
);

// Update restaurant with file upload + validation
router.put(
  "/update/:id",
  uploadRestaurantFiles,
  validateFiles,
  RestaurantController.updateRestaurant
);

// Delete restaurant
router.delete("/delete/:id", RestaurantController.deleteRestaurant);

module.exports = router;
