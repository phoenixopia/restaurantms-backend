const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");

const router = express.Router();

// Public access
router.get("/all-restaurants", RestaurantController.getAllRestaurants);
router.get("/name/:name", RestaurantController.getRestaurantByName);
router.get("/nearby", RestaurantController.getNearbyRestaurants);

module.exports = router;
