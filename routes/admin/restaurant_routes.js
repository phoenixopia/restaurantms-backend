const express = require("express");
const { protect } = require('../../middleware/protect');
const { authorize } = require('../../middleware/authorize');
const { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } = require("../../controllers/admin/restaurant_controller");

const router = express.Router();

router.get("/", getRestaurants);
router.post("/", protect, authorize('super-admin'), createRestaurant);
router.put("/:id", protect, authorize('super-admin'), updateRestaurant);
router.delete("/:id", protect, authorize('super-admin'), deleteRestaurant);

module.exports = router;
