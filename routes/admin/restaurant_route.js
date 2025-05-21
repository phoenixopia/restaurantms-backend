const express = require("express");
const { isAuthenticated, authorize } = require("../../middleware/auth");
const { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } = require("../../controllers/admin/restaurant_controller");

const router = express.Router();

router.get("/", getRestaurants);
router.post("/", isAuthenticated, authorize('super-admin'), createRestaurant);
router.put("/:id", isAuthenticated, authorize('super-admin'), updateRestaurant);
router.delete("/:id", isAuthenticated, authorize('super-admin'), deleteRestaurant);

module.exports = router;
