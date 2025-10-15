const asyncHandler = require("../../utils/asyncHandler");
const CustomerRestaurantService = require("../../services/customer/restaurant_service");
const MenuCategoryService = require("../../services/admin/menuCategory_service");
const { success } = require("../../utils/apiResponse");
const throwError = require("../../utils/throwError");



// // 
// module.exports = {
//   filterRestaurants: async (req, res, next) => {
//     try {
//       const filters = {
//         hasDelivery: req.query.hasDelivery === "true",
//         hasCatering: req.query.hasCatering === "true",
//         minRating: req.query.minRating ? parseFloat(req.query.minRating) : null,
//         userLat: req.query.lat ? parseFloat(req.query.lat) : null,
//         userLng: req.query.lng ? parseFloat(req.query.lng) : null,
//         sortBy: req.query.sortBy || "rating", // rating / popularity / distance
//         page: parseInt(req.query.page) || 1,
//         limit: parseInt(req.query.limit) || 10,
//       };

//       const result = await restaurantService.filterRestaurants(filters);
//       return res.status(200).json(result);
//     } catch (err) {
//       next(err);
//     }
//   },
// }

// Get all restaurants
exports.getAllRestaurants = asyncHandler(async (req, res) => {
  const result = await CustomerRestaurantService.getAllRestaurants(req.query);
  return success(res, "All registered restaurants fetched", result);
});


// Get all restaurants with their cheapest item
exports.getAllRestaurantWithCheapestItems = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result =
    await CustomerRestaurantService.getAllRestaurantsWithCheapestItem({
      page: parseInt(page),
      limit: parseInt(limit),
    });

  return success(
    res,
    "All registered restaurants with cheapest items fetched",
    result
  );
});


// List all category tags
exports.listCategoryTags = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const tags = await MenuCategoryService.listAllCategoriesTags(
    parseInt(page),
    parseInt(limit)
  );
  return success(res, "Category tags fetched", tags);
});

exports.searchRestaurants = asyncHandler(async (req, res) => {
  const result = await CustomerRestaurantService.searchRestaurants(req.query);
  return success(res, "Restaurants fetched successfully", result);
});

exports.getRestaurantsByCategoryTagId = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const categoryTagId = req.params.id;

  if (!categoryTagId) {
    throwError("Category tag ID is required", 400);
  }

  const result = await MenuCategoryService.getRestaurantsByCategoryTagId(
    categoryTagId,
    parseInt(page),
    parseInt(limit)
  );

  return success(
    res,
    "Restaurants with the specified category tag fetched",
    result
  );
});

exports.getBranchMenus = asyncHandler(async (req, res) => {
  const { restaurantId, branchId } = req.params;
  const { page = 1, limit = 10, category = "" } = req.query;

  const menus = await CustomerRestaurantService.getBranchMenus(
    restaurantId,
    branchId,
    parseInt(page),
    parseInt(limit),
    category
  );

  return success(res, "Branch menus fetched successfully", menus);
});

exports.getRestaurantById = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const restaurant = await CustomerRestaurantService.getRestaurantById(
    req.params.id,
    parseInt(page),
    parseInt(limit)
  );
  return success(res, "Restaurant fetched successfully", restaurant);
});
