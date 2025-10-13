// routes/favorite.routes.js
const express = require("express");
const router = express.Router();
const FavoriteController = require("../../controllers/customer/favoriteController");
const { protect } = require("../../middleware/protect");

// Toggle favorite for both menu & restaurant
router.post("/toggle", protect("customer"), FavoriteController.toggleFavorite);

// Get all favorites (optionally filter by ?type=menu or restaurant)
router.get("/", protect("customer"), FavoriteController.getFavorites);

// Get only menu favorites
router.get("/menus/:menuId", protect("customer"), FavoriteController.getMenuFavorites);

// Get only restaurant favorites
router.get("/restaurants/:restaurantId", protect("customer"), FavoriteController.getRestaurantFavorites);

module.exports = router;
