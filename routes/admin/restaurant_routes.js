const express = require("express");
const RestaurantController = require("../../controllers/admin/restaurant_controller");
const validateUploadedFiles = require("../../middleware/validateUploadedFiles");
const { uploadRestaurantFiles } = require("../../middleware/uploads");
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
  "restaurants/owned",
  protect,
  authorize("restaurant_admin"),
  RestaurantController.getRestaurant
);

router.post(
  "restaurants/register",
  protect,
  authorize("restaurant_admin"),
  uploadRestaurantFiles,
  validateUploadedFiles("restaurant"),
  createRestaurantValidator,
  validateRequest,
  RestaurantController.registerRestaurant
);

router.put(
  "restaurants/update/:id",
  protect,
  authorize("restaurant_admin"),
  RestaurantStatus.checkStatusofRestaurant,
  uploadRestaurantFiles,
  validateUploadedFiles("restaurant"),
  updateRestaurantValidator,
  validateRequest,
  RestaurantController.updateRestaurant
);

router.delete(
  "restaurants/delete/:id",
  protect,
  authorize("restaurant_admin"),
  permissionCheck("delete_restaurant"),
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
