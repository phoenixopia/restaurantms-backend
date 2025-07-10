const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");
const ValidateUploadedFiles = require("../../middleware/validateUploadedFiles");
const Upload = require("../../middleware/uploads");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { branchLimit } = require("../../middleware/branchMiddleware");
const validateRequest = require("../../middleware/validateRequest");
const {
  createRestaurantValidator,
  updateRestaurantValidator,
  deleteRestaurantValidator,
  changeStatusValidator,
  paginationValidation,
} = require("../../validators/restaurant_validator");

const router = express.Router();

// ========== SUPER ADMIN ==========
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
  ValidateUploadedFiles.validateUploadedFiles("restaurant"),
  Upload.uploadRestaurantFiles,
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

// ========== RESTAURANT ADMIN ==========
router.get(
  "/owned",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantController.getRestaurant
);

router.post(
  "/add-contact-info",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantController.addContactInfo
);

router.put(
  "/update/:id",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  ValidateUploadedFiles.validateUploadedFiles("restaurant"),
  Upload.uploadRestaurantFiles,
  updateRestaurantValidator,
  validateRequest,
  RestaurantController.updateRestaurant
);

router.delete(
  "/delete/:id",
  protect("user"),
  authorize("restaurant_admin"),
  deleteRestaurantValidator,
  validateRequest,
  RestaurantController.deleteRestaurant
);

// ========== BRANCH MANAGEMENT ==========
router.post(
  "/branches/create-branch",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  branchLimit,
  RestaurantController.createBranch
);

router.put(
  "/branches/:branchId",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  validateRequest,
  RestaurantController.updateBranch
);

router.patch(
  "/branches/:branchId/toggle-status",
  protect("user"),
  permissionCheck("toggle_branch_status"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.toggleBranchStatus
);

router.delete(
  "/branches/:branchId",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantController.deleteBranch
);

router.post(
  "branches/:branchId/contact-info",
  protect("user"),
  permissionCheck("manage_contact_info"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.addBranchContactInfo
);

router.put(
  "branches/:branchId/update-contact-info/:contactInfoId",
  protect("user"),
  permissionCheck("manage_contact_info"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.updateBranchContactInfo
);

router.get(
  "/branches",
  protect("user"),
  permissionCheck("view_branch"),
  RestaurantStatus.checkRestaurantStatus,
  paginationValidation,
  validateRequest,
  RestaurantController.getAllBranches
);

router.get(
  "/branches/:branchId",
  protect("user"),
  permissionCheck("view_branch"),
  RestaurantStatus.checkRestaurantStatus,
  RestaurantController.getBranchById
);

module.exports = router;
