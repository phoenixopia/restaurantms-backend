// controllers/favorite.controller.js
const FavoriteService = require("../../services/customer/favorite_service");
const { success, error } = require("../../utils/apiResponse");
const throwError = require("../../utils/throwError");

class FavoriteController {
  // Toggle favorite (menu or restaurant)
  static async toggleFavorite(req, res) {
    try {
      const { targetId, targetType } = req.body;
      const customerId = req.user.id;

      if (!targetId || !targetType) {
        error(res, "targetId and targetType are required.", 400)
      }

      const favorite = await FavoriteService.toggleFavorite(customerId, targetId, targetType);
      const message = favorite.is_favorite
          ? "Added to favorites"
          : "Removed from favorites";

      return success(res, message, favorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // res.status(500).json({ message: "Internal server error." });
      return throwError(res, 500, "Internal server error.");
    }
  }

  // Get all favorites (or filter by type)
  static async getFavorites(req, res) {
    try {
      const customerId = req.user.id;

      const favorites = await FavoriteService.getFavorites(customerId, req.query);
      return success(res, "Fetched favorites successfully.", favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      return throwError(res, 500, "Internal server error.");
    }
  }

  // Remove favorite by ID
  static async removeFavorite(req, res) {
    try {
      const customerId = req.user.id;
      const favoriteId = req.params.id;

      const result = await FavoriteService.removeFavorite(customerId, favoriteId);
      if (result) {
        return success(res, "Favorite removed successfully.", result);
      } else {
        return throwError(res, 404, "Favorite not found.");
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      return throwError(res, 500, "Internal server error.");
    }
  }

  // Get favorite by targetId
  static async getFavoriteByTargetId(req, res) {
    try {
      const targetId = req.params.targetId;
      const favorite = await FavoriteService.getFavoriteByTargetId(targetId);
      if (favorite) {
        return success(res, "Favorite fetched successfully.", favorite);
      } else {
        return throwError(res, 404, "Favorite not found.");
      }
    } catch (error) {
      console.error("Error fetching favorite:", error);
      return throwError(res, 500, "Internal server error.");
    }
  }

}

module.exports = FavoriteController;
