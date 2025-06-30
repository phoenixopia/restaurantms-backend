const express = require("express");
const RestaurantController = require("../../controllers/restaurant_controller");

const router = express.Router();

router.get(
  "/cheapest-items",
  RestaurantController.getAllRestaurantWithCheapestItems
);

router.get(
  "/category-tag/:id",
  RestaurantController.getRestaurantsByCategoryTagId
);

router.get("/get-all", RestaurantController.getAllRestaurants);

router.get("/:id", RestaurantController.getRestaurantById);

router.get("/search", RestaurantController.searchRestaurants);

module.exports = router;
