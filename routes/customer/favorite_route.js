// routes/favorite.routes.js
const express = require("express");
const router = express.Router();
const FavoriteController = require("../../controllers/customer/favoriteController");
const { protect } = require("../../middleware/protect");

// Toggle favorite for both menu & restaurant
router.post("/toggle", protect("customer"), FavoriteController.toggleFavorite);

// Get all favorites (optionally filter by ?type=menu or restaurant)
router.get("/", protect("customer"), FavoriteController.getFavorites);

// Get favorite by targetId
router.get("/targetId/:targetId", protect("customer"), FavoriteController.getFavoriteByTargetId);

// Remove favorites
router.delete("/remove/:id", protect("customer"), FavoriteController.removeFavorite);

module.exports = router;
