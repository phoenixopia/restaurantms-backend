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
  NotificationController.listNotifications
);
router.put(
  "/mark-as-read/:id",
  protect("user"),
  NotificationController.markAsRead
);
router.get(
  "/unread-count",
  protect("user"),
  NotificationController.unreadCount
);

router.put(
  "/mark-all-as-read",
  protect("user"),
  NotificationController.markAllAsRead
);

router.delete(
  "/delete/:id",
  protect("user"),
  NotificationController.deleteNotification
);

module.exports = router;
