const express = require("express");
const {
  verifyToken,
  isRestaurantAdmin,
} = require("../../../middleware/authMiddleware");
const {
  createRestaurant,
  getRestaurants,
  updateRestaurant,
  deleteRestaurant,
} = require("../../../controllers/admin/restaurant-admin/restaurant_controller");

const router = express.Router();

router.get("/", verifyToken, isRestaurantAdmin, getRestaurants);
router.post("/create", verifyToken, isRestaurantAdmin, createRestaurant);
router.patch("/update/:id", verifyToken, isRestaurantAdmin, updateRestaurant);
router.delete("/delete/:id", verifyToken, isRestaurantAdmin, deleteRestaurant);

module.exports = router;
