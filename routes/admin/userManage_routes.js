const express = require("express");

const UserController = require("../../controllers/user_manage_controller");
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

// Get all created users by the current user
router.get(
  "/",
  protect,
  authorize("restaurant_admin"),
  UserController.getCreatedUsers
);

// Get one created user by ID (only if created by current user)
router.get(
  "/:id",
  protect,
  authorize("restaurant_admin"),
  UserController.getCreatedUserById
);

module.exports = router;
