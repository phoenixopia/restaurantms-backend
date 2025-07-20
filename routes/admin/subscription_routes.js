const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const Upload = require("../../middleware/uploads");
const {
  validateUploadedFiles,
} = require("../../middleware/validateUploadedFiles");
const validateRequest = require("../../middleware/validateRequest");
const SubscriptionController = require("../../controllers/admin/subscription_controller");
const {
  createSubscriptionValidator,
} = require("../../validators/subscription_validator");

router.post(
  "/create",
  protect("user"),
  authorize("restaurant_admin"),
  validateUploadedFiles("receipt"),
  Upload.uploadReceiptFile,
  createSubscriptionValidator,
  validateRequest,
  SubscriptionController.subscribe
);

router.put(
  "/update-status/:id",
  protect("user"),
  authorize("super_admin"),
  SubscriptionController.updateSubscriptionStatus
);

router.get(
  "/list-all",
  protect("user"),
  authorize("super_admin", "restaurant_admin"),
  SubscriptionController.listSubscriptions
);

router.get(
  "/export",
  protect("user"),
  authorize("super_admin"),
  SubscriptionController.exportSubscriptionsToCSV
);

module.exports = router;
