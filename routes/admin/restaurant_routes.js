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
} = require("../../validators/restaurant_validator");

const router = express.Router();

// ================= restaurant related routes
router.get(
  "/owned",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.getRestaurant
);

router.post(
  "/register",
  protect,
  authorize("restaurant_admin"),
  ValidateUploadedFiles.validateUploadedFiles("restaurant"),
  Upload.uploadRestaurantFiles,
  createRestaurantValidator,
  validateRequest,
  RestaurantController.registerRestaurant
);

router.put(
  "/update/:id",
  protect,
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
  protect,
  authorize("restaurant_admin"),
  deleteRestaurantValidator,
  validateRequest,
  RestaurantController.deleteRestaurant
);

// ================= branch related routes
router.post(
  "branches/create-branch",
  protect,
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  branchLimit,
  RestaurantController.createBranch
);

router.put(
  "branches/change-status/:id",
  protect,
  authorize("super_admin"),
  RestaurantStatus.checkStatusofRestaurant,
  changeStatusValidator,
  validateRequest,
  RestaurantController.changeRestaurantStatus
);

router.patch(
  "branches/toggle-active-status/:id",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.toggleRestaurantActiveStatus
);

module.exports = router;
