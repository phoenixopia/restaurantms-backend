const asyncHandler = require("../../middleware/asyncHandler");
const RestaurantService = require("../../services/restaurant_service");
const { success } = require("../../utils/apiResponse");

// Get the restaurant owned by the logged-in user
exports.getRestaurant = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const restaurant = await RestaurantService.getUserRestaurants(userId);
  return success(res, "Restaurant fetched successfully", restaurant);
});

// Unified search (by name, location, etc. with pagination)
exports.searchRestaurants = asyncHandler(async (req, res) => {
  const result = await RestaurantService.searchRestaurants(req.query);
  return success(res, "Restaurants fetched successfully", result);
});

// Register restaurant
exports.registerRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await RestaurantService.createRestaurant(
    req.body,
    req.files,
    req.user.id
  );
  return success(res, "Restaurant registered successfully", restaurant, 201);
});

// Update restaurant
exports.updateRestaurant = asyncHandler(async (req, res) => {
  const updatedRestaurant = await RestaurantService.updateRestaurant(
    req.params.id,
    req.body,
    req.files,
    req.user.id
  );
  return success(res, "Restaurant updated successfully", updatedRestaurant);
});

// Delete restaurant
exports.deleteRestaurant = asyncHandler(async (req, res) => {
  await RestaurantService.deleteRestaurant(req.params.id, req.user.id);
  return success(res, "Restaurant deleted successfully");
});

// Get all  restaurants
exports.getAllRestaurants = asyncHandler(async (req, res) => {
  const result = await RestaurantService.getAllRestaurants(req.query);
  return success(res, "All registered restaurants fetched", result);
});

// Change restaurant status (admin only)
exports.changeRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await RestaurantService.changeRestaurantStatus(
    req.params.id,
    req.body.status
  );
  return success(res, "Restaurant status updated", restaurant);
});
