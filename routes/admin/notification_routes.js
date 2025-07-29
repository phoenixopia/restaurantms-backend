const express = require("express");
const router = express.Router();
const NotificationController = require("../../controllers/admin/notification_controller");
const { protect } = require("../../middleware/protect");

router.post(
  "/create",
  protect("user"),
  NotificationController.createNotification
);
router.get(
  "/get-all",
  protect("user"),
  NotificationController.getAllNotifications
);
router.get(
  "/:id/get",
  protect("user"),
  NotificationController.getNotificationById
);
router.post(
  "/:id/retry",
  protect("user"),
  NotificationController.retryNotification
);

module.exports = router;
