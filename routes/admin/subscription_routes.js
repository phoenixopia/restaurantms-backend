const express = require("express");
const router = express.Router();
const subscriptionController = require("../../controllers/admin/subscription_controller");

router.post("/", subscriptionController.createSubscription);

module.exports = router;
