const asyncHandler = require("../../utils/asyncHandler");
const RestaurantService = require("../../services/admin/restaurant_service");
const ContactInfoService = require("../../services/admin/contact_info_service");
const BranchService = require("../../services/admin/branch_service");
const RestaurantBankAccountService = require("../../services/admin/restaurant_bank_acc_service");
const ChargeSettingService = require("../../services/admin/charge_setting_service");
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

exports.uploadLogoImage = asyncHandler(async (req, res) => {
  const updatedRestaurant = await RestaurantService.uploadLogoImage(
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
  await RestaurantService.deleteRestaurant(req.params.id);
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

// ==========================
// ===== BRANCH MANAGEMENT ==
// ==========================

exports.createBranch = asyncHandler(async (req, res) => {
  const { restaurantId } = req.restaurantData;
  const branch = await BranchService.createBranch(
    restaurantId,
    req.body,
    req.user.id
  );

  return success(res, "Branch created successfully", branch, 201);
});

exports.getAllBranches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await BranchService.getAllBranches({
    page: parseInt(page),
    limit: parseInt(limit),
    user: req.user,
  });

  return success(res, "All branches fetched successfully", result);
});

exports.getBranchById = asyncHandler(async (req, res) => {
  const branch = await BranchService.getBranchById(req.params.id, req.user);
  return success(res, "Branch fetched successfully", branch);
});

exports.updateBranch = asyncHandler(async (req, res) => {
  const updatedBranch = await BranchService.updateBranch(
    req.user,
    req.params.id,
    req.body
  );

  return success(res, "Branch updated successfully", updatedBranch);
});

exports.changeLocation = asyncHandler(async (req, res) => {
  const updatedBranch = await BranchService.changeLocation(
    req.user,
    req.params.id,
    req.body
  );

  return success(res, "Branch updated successfully", updatedBranch);
});

exports.deleteBranch = asyncHandler(async (req, res) => {
  await BranchService.deleteBranch(req.params.id, req.user.id);
  return success(res, "Branch deleted successfully");
});

exports.toggleBranchStatus = asyncHandler(async (req, res) => {
  const updatedBranch = await BranchService.toggleBranchStatus(
    req.params.id,
    req.body,
    req.user
  );

  return success(res, "Branch status updated successfully", updatedBranch);
});

exports.setDefaultBranch = asyncHandler(async (req, res) => {
  const result = await BranchService.setDefault(req.user, req.params.id);
  return success(res, "Branch updated successfully");
});

// ==============================
// ===== CONTACT Info =====
// ==============================

exports.addContactInfo = asyncHandler(async (req, res) => {
  const contactInfo = await ContactInfoService.addContactInfo(
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

  const result = await ContactInfoService.getAllContactInfo(req.user, filters);

  return success(res, "Contact info fetched successfully", result);
});

exports.getContactInfoById = asyncHandler(async (req, res) => {
  const result = await ContactInfoService.getContactInfoById(
    req.user,
    req.params.id
  );
  return success(res, "Contact info fetched successfully", result);
});

exports.updateContactInfo = asyncHandler(async (req, res) => {
  const result = await ContactInfoService.updateContactInfo(
    req.user,
    req.params.id,
    req.body
  );

  return success(res, "Contact info updated successfully", result);
});

exports.deleteContactInfo = asyncHandler(async (req, res) => {
  const result = await ContactInfoService.deleteContactInfo(
    req.user,
    req.params.id
  );
  return success(res, "Contact Info deleted successfully", result);
});

exports.setPrimaryContactInfo = asyncHandler(async (req, res) => {
  const contactInfo = await ContactInfoService.setPrimaryContactInfo(
    req.user,
    req.params.id
  );

  return success(res, "Contact info set as primary successfully", contactInfo);
});

// ==============================
// =========== Bank ============
// ==============================

exports.createBankAccount = asyncHandler(async (req, res) => {
  const account = await RestaurantBankAccountService.createBankAccount(req);
  return success(res, "Bank account created successfully", account);
});

exports.updateBankAccount = asyncHandler(async (req, res) => {
  const account = await RestaurantBankAccountService.updateBankAccount(req);
  return success(res, "Bank account updated successfully", account);
});

exports.getAllBankAccount = asyncHandler(async (req, res) => {
  const account = await RestaurantBankAccountService.getAllBankAccounts(req);
  return success(res, "Bank account fetched successfully", account);
});

exports.getBankAccountById = asyncHandler(async (req, res) => {
  const bankAccountId = req.params.id;
  const account = await RestaurantBankAccountService.getBankAccountById(
    req.user,
    bankAccountId
  );
  return success(res, "Bank account fetched successfully", account);
});

exports.deleteBankAccout = asyncHandler(async (req, res) => {
  const bankAccountId = req.params.id;
  await RestaurantBankAccountService.deleteBankAccount(req.user, bankAccountId);
  return success(res, "Bank account deleted successfully");
});

exports.setDefaultBankAccount = asyncHandler(async (req, res) => {
  const bankAccountId = req.params.id;
  await RestaurantBankAccountService.setDefaultBankAccount(
    req.user,
    bankAccountId
  );
  return success(res, "Default bank account set successfully");
});

// ==============================
// ==== Charge Settings =========
// ==============================

exports.getChargeSetting = asyncHandler(async (req, res) => {
  const result = await ChargeSettingService.getChargeSetting(req.user);
  return success(res, "Charge setting fetched successfully", result);
});

exports.syncUpsertChargeSetting = asyncHandler(async (req, res) => {
  const result = await ChargeSettingService.syncUpsertChargeSetting(
    req.user,
    req.body
  );
  return success(res, "Charge setting updated successfully", result);
});

exports.deleteChargeSetting = asyncHandler(async (req, res) => {
  await ChargeSettingService.deleteChargeSetting(req.user);
  return success(res, "Charge setting deleted successfully");
});
