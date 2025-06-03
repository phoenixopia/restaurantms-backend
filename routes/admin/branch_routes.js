const express = require("express");
const BranchController = require("../../controllers/admin/branch_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");
const {
  filterActiveBranches,
  branchLimit,
} = require("../../middleware/branchMiddleware");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");

const router = express.Router();

// for customer access to view active branches of a restaurant
router.get(
  "/branches/:restaurantId",
  filterActiveBranches,
  BranchController.getAllBranchesUnderRestaurant
);

// register branch. . . . restaurant admins only
router.post(
  "/register",
  protect,
  authorize("restaurant_admin"),
  permissionCheck("register_branch"),
  branchLimit,
  RestaurantStatus.checkRestaurantStatus,
  BranchController.createBranch
);

// single branch view for restaurant admin, staffs . . . . .
router.get(
  "/branches/:branchId",
  protect,
  permissionCheck("view_branch"),
  BranchController.getBranchById
);

// for restaurant admin to view all branches under their restaurant
router.get(
  "/restaurants/branches/:restaurantId",
  protect,
  authorize("restaurant_admin"),
  BranchController.getAdminBranches
);

// update branch details . . . . restaurant admins only
router.put(
  "/branches/:branchId",
  protect,
  authorize("restaurant_admin"),
  RestaurantStatus.checkStatusofRestaurant,
  BranchController.updateBranch
);

// delete branch . . . . restaurant admins only
router.delete(
  "/branches/:branchId",
  protect,
  authorize("restaurant_admin"),
  BranchController.deleteBranch
);

module.exports = router;
