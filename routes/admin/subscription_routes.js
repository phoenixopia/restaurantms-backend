const express = require("express");
const router = express.Router();
const subscriptionController = require("../../controllers/admin/subscription_controller");
const { authorize } = require("../../middleware/authorize");
const { protect } = require("../../middleware/protect");

router.post(
  "/",
  protect,
  authorize("restaurant_admin"),
  subscriptionController.createSubscription
);

module.exports = router;
