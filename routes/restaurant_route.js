const express = require("express");
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');
const { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant, getRestaurantById } = require("../controllers/restaurant_controller");

const router = express.Router();

router.get("/", getRestaurants);
router.get("/:id", getRestaurantById);
router.post("/", protect, authorize('super_admin'), createRestaurant);
router.put("/:id", protect, authorize('super_admin'), updateRestaurant);
router.delete("/:id", protect, authorize('super_admin'), deleteRestaurant);

module.exports = router;
