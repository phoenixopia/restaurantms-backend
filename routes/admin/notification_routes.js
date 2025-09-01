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
  "/mark-as-read/id",
  protect("user"),
  NotificationController.getNotificationById
);
router.get(
  "/unread-count",
  protect("user"),
  NotificationController.retryNotification
);

module.exports = router;
