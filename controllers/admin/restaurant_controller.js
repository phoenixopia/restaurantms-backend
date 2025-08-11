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
  const restaurant = await RestaurantService.getUserRestaurants(req.user);
  return success(res, "Restaurant fetched successfully", restaurant);
});

exports.registerRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await RestaurantService.createRestaurant(
    req.body,
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

exports.updateBasicInfo = asyncHandler(async (req, res) => {
  const result = await RestaurantService.updateBasicInfo(
    req.params.id,
    req.body,
    req.user
  );

  return success(res, "Restaurant basic info updated successfully", result);
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

  const filters = {
    search: req.query.search || null,
    status: req.query.status || null,
    createdFilter: req.query.created_filter || null,
    billingCycle: req.query.billing_cycle || null,
    subscriptionStatus: req.query.subscription_status || null,
  };

  const result = await RestaurantService.getAllRestaurantsWithSubscriptions({
    page,
    limit,
    filters,
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
  const contactInfo = await RestaurantService.addContactInfo(
    req.user,
    req.body
  );
  return success(res, "Contact info added successfully", contactInfo);
});

exports.getAllContactInfo = asyncHandler(async (req, res) => {
  const filters = {
    module_type: req.query.module_type || null,
    search_value: req.query.search_value || null,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
  };

  const result = await RestaurantService.getAllContactInfo(req.user, filters);

  return success(res, "Contact info fetched successfully", result);
});

exports.getContactInfoById = asyncHandler(async (req, res) => {
  const result = await RestaurantService.getContactInfoById(
    req.user,
    req.params.id
  );
  return success(res, "Contact info fetched successfully", result);
});

exports.updateContactInfo = asyncHandler(async (req, res) => {
  const result = await RestaurantService.updateContactInfo(
    req.user,
    req.params.id,
    req.body
  );

  return success(res, "Contact info updated successfully", result);
});

exports.deleteContactInfo = asyncHandler(async (req, res) => {
  const result = await RestaurantService.deleteContactInfo(
    req.user,
    req.params.id
  );
  return success(res, "Contact Info deleted successfully", result);
});

exports.setPrimaryContactInfo = asyncHandler(async (req, res) => {
  const contactInfo = await RestaurantService.setPrimaryContactInfo(
    req.user,
    req.params.id
  );

  return success(res, "Contact info set as primary successfully", contactInfo);
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

// exports.addBranchContactInfo = asyncHandler(async (req, res) => {
//   const { branchId } = req.params;
//   const contactInfo = await BranchService.addBranchContactInfo(
//     branchId,
//     req.body,
//     req.user
//   );
//   return success(res, "Branch contact info added successfully", contactInfo);
// });

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
