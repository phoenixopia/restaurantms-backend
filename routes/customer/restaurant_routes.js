const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");

const router = express.Router();

router.get("/get-all", RestaurantController.getAllRestaurants);

router.get(
  "/cheapest-items",
  RestaurantController.getAllRestaurantWithCheapestItems
);

router.get("/:id", RestaurantController.getRestaurantById);

router.get("/search", RestaurantController.searchRestaurants);

router.get(
  "/category-tag/:id",
  RestaurantController.getRestaurantsByCategoryTagId
);

module.exports = router;
