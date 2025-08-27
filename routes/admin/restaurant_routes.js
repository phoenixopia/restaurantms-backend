const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");
const ValidateUploadedFiles = require("../../middleware/validateUploadedFiles");
const checkStorageQuota = require("../../middleware/checkStorageCapacity");
const Upload = require("../../middleware/uploads");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { branchLimit } = require("../../middleware/branchMiddleware");
const validateRequest = require("../../middleware/validateRequest");
const {
  createRestaurantValidator,
  deleteRestaurantValidator,
  changeStatusValidator,
} = require("../../validators/restaurant_validator");

const router = express.Router();

// ===================== SUPER ADMIN ==================
router.get(
  "/all-registered-restaurants",
  protect("user"),
  authorize("super_admin"),
  RestaurantController.getAllRestaurantsWithSubscriptions
);

router.get(
  "/registered-restaurant/:id",
  protect("user"),
  authorize("super_admin"),
  RestaurantController.getRestaurantWithSubscriptionById
);

router.post(
  "/register",
  protect("user"),
  authorize("super_admin"),
  createRestaurantValidator,
  validateRequest,
  RestaurantController.registerRestaurant
);

router.put(
  "/change-status/:id",
  protect("user"),
  authorize("super_admin"),
  changeStatusValidator,
  validateRequest,
  RestaurantController.changeRestaurantStatus
);

// ======================== RESTAURANT ADMIN =======================
router.get(
  "/get-my-restaurant",
  protect("user"),
  // permissionCheck("view_restaurant"),
  RestaurantController.getRestaurant
);

router.put(
  "/update-basic-info/:id",
  protect("user"),
  // permissionCheck("update_restaurant"),
  RestaurantController.updateBasicInfo
);

router.put(
  "/upload-logo-image",
  protect("user"),
  // permissionCheck("update_restaurant"),
  RestaurantStatus.checkRestaurantStatus,
  Upload.uploadRestaurantFiles,
  ValidateUploadedFiles.validateUploadedFiles("restaurant"),
  checkStorageQuota,
  RestaurantController.uploadLogoImage
);

router.delete(
  "/delete/:id",
  protect("user"),
  authorize("super_admin"),
  deleteRestaurantValidator,
  validateRequest,
  RestaurantController.deleteRestaurant
);

// ========================= BRANCH MANAGEMENT =========================
router.post(
  "/branches/create-branch",
  protect("user"),
  authorize("restaurant_admin"),
  // RestaurantStatus.checkRestaurantStatus,
  // branchLimit,
  RestaurantController.createBranch
);

router.put(
  "/update-branch/:id",
  protect("user"),
  // permissionCheck("update_branch"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.updateBranch
);

router.patch(
  "/toggle-branch-status/:id",
  protect("user"),
  // permissionCheck("toggle_branch_status"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.toggleBranchStatus
);

router.delete(
  "/branches/:id",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantController.deleteBranch
);

router.get(
  "/get-all-branches",
  protect("user"),
  // permissionCheck("view_branch"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.getAllBranches
);

router.get(
  "/get-branch-byId/:id",
  protect("user"),
  // permissionCheck("view_branch"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.getBranchById
);

router.put(
  "/update-location/:id",
  protect("user"),
  // permissionCheck("update_branch"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.changeLocation
);

router.put(
  "/set-default/:id",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.setDefaultBranch
);

// =============================== Contact Info =====================

router.post(
  "/add-contact-info",
  protect("user"),
  // permissionCheck("add_contact_info"),
  RestaurantController.addContactInfo
);

router.get(
  "/contact-info",
  protect("user"),
  // permissionCheck("view_contact_info"),
  RestaurantController.getAllContactInfo
);

router.get(
  "/get-byId/:id",
  protect("user"),
  // permissionCheck("view_contact_info"),
  RestaurantController.getContactInfoById
);

router.put(
  "/update-contact-info/:id",
  protect("user"),
  // permissionCheck("update_contact_info"),
  RestaurantController.updateContactInfo
);

router.put(
  "/set-primary-contact/:id",
  protect("user"),
  // permissionCheck("update_contact_info"),
  RestaurantController.setPrimaryContactInfo
);

router.delete(
  "/delete-contact-info/:id",
  protect("user"),
  // permissionCheck("delete_contact_info"),
  RestaurantController.deleteContactInfo
);

// ====================== Bank ========================
router.put(
  "/create-bank-account",
  protect("user"),
  // permissionCheck("add_bank_account"),
  RestaurantController.createBankAccount
);

router.put(
  "/update-bank-account/:id",
  protect("user"),
  // permissionCheck("update_bank_account"),
  RestaurantController.updateBankAccount
);

router.get(
  "/get-bank-info",
  protect("user"),
  // permissionCheck("view_bank_account"),
  RestaurantController.getAllBankAccount
);

router.get(
  "/get-bank-byId/:id",
  protect("user"),
  // permissionCheck("view_bank_account"),
  RestaurantController.getBankAccountById
);

router.delete(
  "/delet-bank-account/:id",
  protect("user"),
  // permissionCheck("delete_bank_account"),
  RestaurantController.deleteBankAccout
);

router.put(
  "/set-default-bank-account/:id",
  protect("user"),
  // permissionCheck("update_bank_account"),
  RestaurantController.setDefaultBankAccount
);

// ==================== charge setting ===================
router.get(
  "/charge-settings",
  protect("user"),
  // permissionCheck("view_charge_setting"),
  RestaurantController.getChargeSetting
);

router.get(
  "/create-update-charge-setting",
  protect("user"),
  // permissionCheck("manage_charge_setting"),
  RestaurantController.syncUpsertChargeSetting
);

router.delete(
  "/delete-charge-settings",
  protect("user"),
  // permissionCheck("delete_charge_setting"),
  RestaurantController.deleteChargeSetting
);

module.exports = router;
