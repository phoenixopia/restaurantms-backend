const asyncHandler = require("../../utils/asyncHandler");
const RestaurantService = require("../../services/admin/restaurant_service");
const BranchService = require("../../services/admin/branch_service");
const MenuCategoryService = require("../../services/admin/menuCategory_service");
const { success } = require("../../utils/apiResponse");
const throwError = require("../../utils/throwError");

// =========================
// ===== RESTAURANT CRUD ===
// =========================

exports.getRestaurant = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const restaurant = await RestaurantService.getUserRestaurants(userId);
  return success(res, "Restaurant fetched successfully", restaurant);
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

exports.changeRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await RestaurantService.changeRestaurantStatus(
    req.params.id,
    req.body.status
  );
  return success(res, "Restaurant status updated", restaurant);
});

// ===============================
// ===== RESTAURANT RETRIEVAL ====
// ===============================

exports.getAllRestaurants = asyncHandler(async (req, res) => {
  const result = await RestaurantService.getAllRestaurants(req.query);
  return success(res, "All registered restaurants fetched", result);
});

exports.getAllRestaurantsWithSubscriptions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const result = await RestaurantService.getAllRestaurantsWithSubscriptions({
    page,
    limit,
  });
  return success(
    res,
    "Restaurants with subscriptions fetched successfully",
    result
  );
});

exports.getAllRestaurantWithCheapestItems = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await RestaurantService.getAllRestaurantsWithCheapestItem({
    page: parseInt(page),
    limit: parseInt(limit),
  });

  return success(
    res,
    "All registered restaurants with cheapest items fetched",
    result
  );
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

exports.getBranchMenus = asyncHandler(async (req, res) => {
  const { restaurantId, branchId } = req.params;
  const { page = 1, limit = 10, category = "" } = req.query;

  const menus = await RestaurantService.getBranchMenus(
    restaurantId,
    branchId,
    parseInt(page),
    parseInt(limit),
    category
  );

  return success(res, "Branch menus fetched successfully", menus);
});

exports.getRestaurantWithSubscriptionById = asyncHandler(async (req, res) => {
  const restaurant = await RestaurantService.getRestaurantWithSubscriptionById(
    req.params.id
  );
  return success(res, "Restaurant fetched successfully", restaurant);
});

exports.getRestaurantProfileWithVideos = asyncHandler(async (req, res) => {
  const restaurantId = req.params.id;
  const customerId = req.user?.id || null;
  const { page = 1, limit = 10, filter = "latest" } = req.query;

  const result = await RestaurantService.getRestaurantProfileWithVideos(
    restaurantId,
    customerId,
    {
      page: parseInt(page),
      limit: parseInt(limit),
      filter,
    }
  );

  return success(res, "Restaurant profile fetched successfully", result);
});

exports.searchRestaurants = asyncHandler(async (req, res) => {
  const result = await RestaurantService.searchRestaurants(req.query);
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

// ==============================
// ===== RESTAURANT CONTACT =====
// ==============================

exports.addContactInfo = asyncHandler(async (req, res) => {
  const { restaurant_id, module_type, type, value, is_primary, module_id } =
    req.body;

  if (!["restaurant", "branch"].includes(module_type)) {
    return throwError(
      "Invalid module_type. Must be 'restaurant' or 'branch'",
      400
    );
  }

  if (module_type === "branch" && !module_id) {
    return throwError(
      "module_id is required when module_type is 'branch'",
      400
    );
  }

  const resolvedModuleId =
    module_type === "restaurant" ? restaurant_id : module_id;

  const contactInfo = await RestaurantService.addContactInfo({
    restaurant_id,
    module_type,
    module_id: resolvedModuleId,
    type,
    value,
    is_primary: is_primary || false,
  });

  return success(res, "Contact info added successfully", contactInfo);
});

// ==========================
// ===== BRANCH MANAGEMENT ==
// ==========================

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

exports.getAllBranches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const restaurantId = req.user.restaurant_id;

  const result = await BranchService.getAllBranches({
    restaurantId,
    page: parseInt(page),
    limit: parseInt(limit),
    user: req.user,
  });

  return success(res, "All branches fetched successfully", result);
});

exports.getBranchById = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const branch = await BranchService.getBranchById(branchId, req.user);

  if (!branch) {
    throwError("Branch not found", 404);
  }

  return success(res, "Branch fetched successfully", branch);
});

exports.updateBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const userId = req.user.id;
  const updates = req.body;

  const updatedBranch = await BranchService.updateBranch(
    branchId,
    updates,
    userId
  );

  return success(res, "Branch updated successfully", updatedBranch);
});

exports.deleteBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  await BranchService.deleteBranch(branchId, req.user.id);
  return success(res, "Branch deleted successfully");
});

exports.toggleBranchStatus = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const { status } = req.body;

  const updatedBranch = await BranchService.toggleBranchStatus(
    branchId,
    status,
    req.user
  );

  return success(res, "Branch status updated successfully", updatedBranch);
});

// ===============================
// ===== BRANCH CONTACT INFO =====
// ===============================

exports.addBranchContactInfo = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const contactInfo = await BranchService.addBranchContactInfo(
    branchId,
    req.body,
    req.user
  );
  return success(res, "Branch contact info added successfully", contactInfo);
});

exports.updateBranchContactInfo = asyncHandler(async (req, res) => {
  const { branchId, contactInfoId } = req.params;
  const updated = await BranchService.updateBranchContactInfo(
    branchId,
    contactInfoId,
    req.body,
    req.user
  );

  return success(res, "Branch contact info updated successfully", updated);
});
