// services/favorite.service.js
const { Favorite, Restaurant, Menu } = require("../../models/index");
const { buildPagination } = require("../../utils/pagination");

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

  // // Get all favorites for a menu
  // static async getFavorites(customerId, query) {
  //   const where = { customer_id: customerId, is_favorite: true, targetType: query.type};

  //   const include =
  //     targetType === "menu"
  //       ? [{ model: Menu }]
  //       : targetType === "restaurant"
  //       ? [{ model: Restaurant }]
  //       : [{ model: Menu }, { model: Restaurant }];

  //   return Favorite.findAll({ where, include });
  // }

  // Get all favorites (optionally filtered by targetType) with pagination
  static async getFavorites(customerId, query = {}) {
    const { page, limit, offset, order } = buildPagination(query);

    const where = { customer_id: customerId, is_favorite: true };
    if (query.targetType) where.targetType = query.targetType;  // ?type=menu or restaurant

    const include =
      query?.targetType === "menu"
        ? [{ model: Menu }]
        : query?.targetType === "restaurant"
        ? [{ model: Restaurant }]
        : [{ model: Menu }, { model: Restaurant }];

    // Count total favorites
    const total = await Favorite.count({ where });

    // Fetch paginated favorites
    const favorites = await Favorite.findAll({
      where,
      include,
      limit,
      offset,
      order, // uses order from buildPagination (e.g. [["createdAt", "DESC"]])
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: "Favorites retrieved successfully",
      data: {
        favorites,
        total,
        page,
        limit,
        total_pages: totalPages,
      },
    };
  }



  // Get only menu favorites
  static async getMenuFavorites(customerId, menuId) {
    return Favorite.findAll({
      where: { customer_id: customerId, targetType: "menu", targetId: menuId, is_favorite: true },
      include: [{ model: Menu }],
    });
  }
  

  // Get only restaurant favorites with pagination
static async getRestaurantFavorites(customerId, restaurantId, query = {}) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  const where = {
    customer_id: customerId,
    targetId: restaurantId,
    targetType: "restaurant",
    is_favorite: true,
  };

  // Count total favorites
  const total = await Favorite.count({ where });

  // Get paginated favorites
  const favorites = await Favorite.findAll({
    where,
    include: [{ model: Restaurant }],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  const totalPages = Math.ceil(total / limit);

  // Return consistent response shape
  return {
    success: true,
    message: "Favorites retrieved successfully",
    data: {
      total,
      page,
      limit,
      total_pages: totalPages,
      favorites,
    },
  };
}

  // static async getRestaurantFavorites(customerId, restaurantId) {
  //   return Favorite.findAll({
  //     where: {
  //       customer_id: customerId,
  //       targetId: restaurantId,
  //       targetType: "restaurant",
  //       is_favorite: true,
  //     },
  //     include: [{ model: Restaurant }],
  //   });
  // }
}

module.exports = FavoriteService;
