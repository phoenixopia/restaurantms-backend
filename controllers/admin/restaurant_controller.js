const asyncHandler = require("../../middleware/asyncHandler");
const RestaurantService = require("../../services/admin/restaurant_service");
const BranchService = require("../../services/admin/branch_service");
const MenuCategoryService = require("../../services/admin/menuCategory_service");
const { success } = require("../../utils/apiResponse");
const throwError = require("../../utils/throwError");

exports.getRestaurant = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const restaurant = await RestaurantService.getUserRestaurants(userId);
  return success(res, "Restaurant fetched successfully", restaurant);
});

exports.searchRestaurants = asyncHandler(async (req, res) => {
  const result = await RestaurantService.searchRestaurants(req.query);
  return success(res, "Restaurants fetched successfully", result);
});

exports.registerRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await RestaurantService.createRestaurant(
    req.body,
    req.files,
    req.user.id
  );
  return success(res, "Restaurant registered successfully", restaurant, 201);
});

exports.updateRestaurant = asyncHandler(async (req, res) => {
  const updatedRestaurant = await RestaurantService.updateRestaurant(
    req.params.id,
    req.body,
    req.files,
    req.user
  );
  return success(res, "Restaurant updated successfully", updatedRestaurant);
});

exports.deleteRestaurant = asyncHandler(async (req, res) => {
  await RestaurantService.deleteRestaurant(req.params.id, req.user);
  return success(res, "Restaurant deleted successfully");
});

exports.getAllRestaurants = asyncHandler(async (req, res) => {
  const result = await RestaurantService.getAllRestaurants(req.query);
  return success(res, "All registered restaurants fetched", result);
});

exports.getRestaurantById = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const restaurant = await RestaurantService.getRestaurantById(
    req.params.id,
    parseInt(page),
    parseInt(limit)
  );
  return success(res, "Restaurant fetched successfully", restaurant);
});

exports.getAllRestaurantWithCheapestItems = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const result =
    await RestaurantService.getAllRestaurantsWithMenusAndCheapestItems({
      page: parseInt(page),
      limit: parseInt(limit),
    });
  return success(
    res,
    "All registered restaurants with cheapest items fetched",
    result
  );
});

exports.getRestaurantsByCategoryTagId = asyncHandler(async (req, res) => {
  const { categoryTagId, page = 1, limit = 10 } = req.query;

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

exports.changeRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await RestaurantService.changeRestaurantStatus(
    req.params.id,
    req.body.status
  );
  return success(res, "Restaurant status updated", restaurant);
});

exports.createBranch = asyncHandler(async (req, res) => {
  const { restaurantId, branchLimit } = req.restaurantData;

  const branch = await BranchService.createBranch(
    req.body,
    req.user.id,
    restaurantId,
    branchLimit
  );

  return success(res, "Branch created successfully", branch, 201);
});

exports.updateBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const updated = await BranchService.updateBranch(
    branchId,
    req.body,
    req.user.id
  );
  return success(res, "Branch updated successfully", updated);
});

exports.deleteBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  await BranchService.deleteBranch(branchId, req.user.id);
  return success(res, "Branch deleted successfully");
});

exports.getAllBranches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const { restaurantId } = req.restaurantData;

  const result = await BranchService.getAllBranches(
    restaurantId,
    parseInt(page),
    parseInt(limit)
  );

  return success(res, "All branches fetched successfully", result);
});

exports.getBranchById = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const branch = await BranchService.getBranchById(branchId);

  if (!branch) {
    throwError("Branch not found", 404);
  }

  return success(res, "Branch fetched successfully", branch);
});
