const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription_controller");
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');
const checkRestaurantStatus = require("../middleware/checkRestaurantStatus");

router.post("/", protect, authorize("super_admin"), checkRestaurantStatus, subscriptionController.createSubscription);
// router.get("/", protect, authorize("super_admin"), subscriptionController.getAllSubscriptions);
router.get("/", protect, authorize("super_admin", "admin"), subscriptionController.getSubscriptionForUser)

module.exports = router;
