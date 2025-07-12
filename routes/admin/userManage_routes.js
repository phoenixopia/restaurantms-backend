const express = require("express");

const UserController = require("../../controllers/admin/user_manage_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

// Create a restaurant admin
router.post(
  "/create/restaurant-admin",
  protect("user"),
  authorize("super_admin"),
  UserController.createRestaurantAdmin
);

// Create a staff user (email or phone)
router.post(
  "/create/staff",
  protect("user"),
  authorize("restaurant_admin"),
  UserController.createStaff
);

// Delete a user by ID
router.delete(
  "/delete/:id",
  protect("user"),
  authorize("restaurant_admin", "super_admin"),
  UserController.deleteUser
);

// Get all created users by the current user
router.get(
  "/get-all-users",
  protect("user"),
  authorize("restaurant_admin", "super_admin"),
  UserController.getCreatedUsers
);

// Get one created user by ID (only if created by current user)
router.get(
  "/:id",
  protect("user"),
  authorize("restaurant_admin", "super_admin"),
  UserController.getCreatedUserById
);

// Assign user to a branch
router.post(
  "/assign/branch",
  protect("user"),
  authorize("restaurant_admin"),
  UserController.assignUserToBranch
);

// Assign admin to a restaurant
router.post(
  "/assign/restaurant",
  protect("user"),
  authorize("super_admin"),
  UserController.assignRestaurantAdmin
);

// Assign a branch manager
router.post(
  "/assign/branch-manager",
  protect("user"),
  authorize("restaurant_admin"),
  UserController.assignBranchManager
);

router.post(
  "/remove/branch-manager",
  protect("user"),
  authorize("restaurant_admin"),
  UserController.removeBranchManager
);

module.exports = router;
