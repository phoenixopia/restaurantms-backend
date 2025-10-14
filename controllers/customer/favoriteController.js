// controllers/favorite.controller.js
const FavoriteService = require("../../services/customer/favorite_service");

class FavoriteController {
  // Toggle favorite (menu or restaurant)
  static async toggleFavorite(req, res) {
    try {
      const { targetId, targetType } = req.body;
      const customerId = req.user.id; // from JWT middleware

      if (!targetId || !targetType) {
        return res.status(400).json({ message: "targetId and targetType are required." });
      }

      const favorite = await FavoriteService.toggleFavorite(customerId, targetId, targetType);

      res.status(200).json({
        success: true,
        message: favorite.is_favorite
          ? "Added to favorites"
          : "Removed from favorites",
        data: favorite,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }

  // Get all favorites (or filter by type)
  static async getFavorites(req, res) {
    try {
      const customerId = req.user.id;

      const favorites = await FavoriteService.getFavorites(customerId, req.query);
      res.status(200).json({ success: true, data: favorites });
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }

  // // Get menu favorites only
  // static async getMenuFavorites(req, res) {
  //   try {
  //     const customerId = req.user.id;
  //     const {menuId} = req.params;
  //     const favorites = await FavoriteService.getMenuFavorites(customerId, menuId);
  //     res.status(200).json({ success: true, data: favorites });
  //   } catch (error) {
  //     console.error("Error fetching menu favorites:", error);
  //     res.status(500).json({ message: "Internal server error." });
  //   }
  // }

  // // Get restaurant favorites only
  // static async getRestaurantFavorites(req, res) {
  //   try {
  //     const customerId = req.user.id;
  //     const {restaurantId} = req.params;
  //     const favorites = await FavoriteService.getRestaurantFavorites(customerId, restaurantId);
  //     res.status(200).json({ success: true, data: favorites });
  //   } catch (error) {
  //     console.error("Error fetching restaurant favorites:", error);
  //     res.status(500).json({ message: "Internal server error." });
  //   }
  // }
}

module.exports = FavoriteController;
