const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");

const router = express.Router();

router.get("/restaurants", RestaurantController.getAllRestaurants);
router.get("/search", RestaurantController.searchRestaurants);

module.exports = router;
