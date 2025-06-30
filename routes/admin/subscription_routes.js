const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const validateRequest = require("../../middleware/validateRequest");
const SubscriptionController = require("../../controllers/subscription_controller");
const {
  createSubscriptionValidator,
} = require("../../validators/subscription_validator");

router.post(
  "/create",
  protect,
  authorize("restaurant_admin"),
  createSubscriptionValidator,
  validateRequest,
  SubscriptionController.subscribe
);

module.exports = router;
