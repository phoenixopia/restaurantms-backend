const express = require("express");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
// const checkPermission = require("../../middleware/checkPermission");
const RestaurantController = require("../../controllers/admin/restaurant_controller");

const router = express.Router();

router.get("/all-restaurants", RestaurantController.getAllRestaurants);

router.get("/name/:name", RestaurantController.getRestaurantByName);

// restaurant by rating , nearby location

router.get("/nearby", RestaurantController.getNearbyRestaurants);

// under admin side to fetch restaurants
router.get(
  "/",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.getRestaurant
);

router.post(
  "/register",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.registerRestaurant
);

router.put(
  "/update/:id",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.updateRestaurant
);

router.delete(
  "/delete/:id",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.deleteRestaurant
);

module.exports = router;
