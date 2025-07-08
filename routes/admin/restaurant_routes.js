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

// for the owner of restaurant
router.get(
  "/owned",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantController.getRestaurant
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
  "/update/:id",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkStatusofRestaurant,
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

router.put(
  "/change-status/:id",
  protect("user"),
  authorize("super_admin"),
  RestaurantStatus.checkStatusofRestaurant,
  changeStatusValidator,
  validateRequest,
  RestaurantController.changeRestaurantStatus
);

// Branch routes

router.post(
  "/branches/create-branch",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkStatusofRestaurant,
  branchLimit,
  RestaurantController.createBranch
);

router.put(
  "/branches/:branchId",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkStatusofRestaurant,
  validateRequest,
  RestaurantController.updateBranch
);

router.delete(
  "/branches/:branchId",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantController.deleteBranch
);

router.get(
  "/branches",
  protect("user"),
  paginationValidation,
  validateRequest,
  RestaurantController.getAllBranches
);

router.get(
  "/branches/:branchId",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantController.getBranchById
);

module.exports = router;
