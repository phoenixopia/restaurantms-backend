const express = require("express");
const router = express.Router();
const subscriptionController = require("../../controllers/admin/subscription_controller");
const { protect } = require('../../middleware/protect');
const { authorize } = require('../../middleware/authorize');
const checkRestaurantStatus = require("../../middleware/checkRestaurantStatus");

router.post(
  "/",
  protect,
  authorize("restaurant_admin"),
  checkRestaurantStatus,
  subscriptionController.createSubscription
);

module.exports = router;
