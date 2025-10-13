// services/favorite.service.js
const { Favorite, Restaurant, Menu } = require("../../models/index");

class FavoriteService {
  // Toggle favorite (add/remove)
  static async toggleFavorite(customerId, targetId, targetType) {
    let favorite = await Favorite.findOne({
      where: { customer_id: customerId, targetId, targetType },
    });

    if (favorite) {
      favorite.is_favorite = !favorite.is_favorite;
      await favorite.save();
    } else {
      favorite = await Favorite.create({
        customer_id: customerId,
        targetId,
        targetType,
        is_favorite: true,
      });
    }

    return favorite;
  }

  // Get all favorites for a customer
  static async getFavorites(customerId, targetType = null) {
    const where = { customer_id: customerId, is_favorite: true };
    if (targetType) where.targetType = targetType;

    const include =
      targetType === "menu"
        ? [{ model: Menu }]
        : targetType === "restaurant"
        ? [{ model: Restaurant }]
        : [{ model: Menu }, { model: Restaurant }];

    return Favorite.findAll({ where, include });
  }

  // Get only menu favorites
  static async getMenuFavorites(customerId, menuId) {
    return Favorite.findAll({
      where: { customer_id: customerId, targetType: "menu", targetId: menuId, is_favorite: true },
      include: [{ model: Menu }],
    });
  }

  // Get only restaurant favorites
  static async getRestaurantFavorites(customerId, restaurantId) {
    return Favorite.findAll({
      where: {
        customer_id: customerId,
        targetId: restaurantId,
        targetType: "restaurant",
        is_favorite: true,
      },
      include: [{ model: Restaurant }],
    });
  }
}

module.exports = FavoriteService;





// const { MenuFavorite, RestaurantFavorite } = require("../models");
// const { throwError } = require("../utils/errorHelper");

// class FavoriteService {
//   // ----------- RESTAURANT FAVORITES -----------
//   static async toggleRestaurantFavorite(customerId, restaurantId) {
//     const existing = await RestaurantFavorite.findOne({
//       where: { customer_id: customerId, restaurant_id: restaurantId },
//     });

//     if (existing) {
//       await existing.destroy();
//       return { message: "Removed from favorites", favorited: false };
//     }

//     await RestaurantFavorite.create({
//       customer_id: customerId,
//       restaurant_id: restaurantId,
//     });

//     return { message: "Added to favorites", favorited: true };
//   }

//   static async getRestaurantFavorites(customerId) {
//     const favorites = await RestaurantFavorite.findAll({
//       where: { customer_id: customerId },
//       include: ["restaurant"],
//     });

//     return {
//       count: favorites.length,
//       data: favorites.map((fav) => fav.restaurant),
//     };
//   }

//   // ----------- MENU FAVORITES -----------
//   static async toggleMenuFavorite(customerId, menuId) {
//     const existing = await MenuFavorite.findOne({
//       where: { customer_id: customerId, menu_id: menuId },
//     });

//     if (existing) {
//       await existing.destroy();
//       return { message: "Removed from favorites", favorited: false };
//     }

//     await MenuFavorite.create({
//       customer_id: customerId,
//       menu_id: menuId,
//     });

//     return { message: "Added to favorites", favorited: true };
//   }

//   static async getMenuFavorites(customerId) {
//     const favorites = await MenuFavorite.findAll({
//       where: { customer_id: customerId },
//       include: ["menu"],
//     });

//     return {
//       count: favorites.length,
//       data: favorites.map((fav) => fav.menu),
//     };
//   }
// }

// module.exports = FavoriteService;
