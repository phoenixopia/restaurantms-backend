const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");
const MenuController = require("../../controllers/admin/menu_controller");

const router = express.Router();

router.get("/get-all", RestaurantController.getAllRestaurants);

router.get(
  "/cheapest-items",
  RestaurantController.getAllRestaurantWithCheapestItems
);

router.get("/menu-category-tags/list", MenuController.listCategoryTags);

router.get("/search", RestaurantController.searchRestaurants);

router.get(
  "/category-tag/:id",
  RestaurantController.getRestaurantsByCategoryTagId
);

router.get("/:id", RestaurantController.getRestaurantById);

module.exports = router;
