const express = require("express");

const UserController = require("../../controllers/admin/user_manage_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
// const { permissionCheck } = require("../../middleware/permissionCheck");

const router = express.Router();

// Create a staff user (email or phone)
router.post(
  "/create",
  protect,
  authorize("restaurant_admin"),
  UserController.createUser
);

// Delete a user by ID
router.delete(
  "/delete/:id",
  protect,
  authorize("restaurant_admin"),
  UserController.deleteUser
);

// Edit a user by ID
router.put(
  "/update/:id",
  protect,
  authorize("restaurant_admin"),
  UserController.editUser
);

// Get all created users by the current user
router.get(
  "/",
  protect,
  authorize("restaurant_admin"),
  UserController.getCreatedUsers
);

// Search created users by name with pagination
router.get(
  "/search",
  protect,
  authorize("restaurant_admin"),
  UserController.searchCreatedUsers
);

// Get one created user by ID (only if created by current user)
router.get(
  "/:id",
  protect,
  authorize("restaurant_admin"),
  UserController.getCreatedUserById
);

module.exports = router;
