const express = require("express");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const checkPermission = require("../../middleware/checkPermission");
const {
  registerRestaurant,
  getRestaurant,
  updateRestaurant,
  deleteRestaurant,
} = require("../../controllers/admin/restaurant_controller");

const router = express.Router();

router.get("/", protect, authorize("restaurant_admin"), getRestaurant);

router.post(
  "/register",
  protect,
  authorize("restaurant_admin"),
  registerRestaurant
);

router.put(
  "/update/:id",
  protect,
  authorize("restaurant_admin"),
  updateRestaurant
);

router.delete(
  "/delete/:id",
  protect,
  authorize("restaurant_admin"),
  deleteRestaurant
);

module.exports = router;
