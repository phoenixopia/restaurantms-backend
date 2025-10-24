const express = require("express");
const router = express.Router();
const NotificationController = require("../../controllers/customer/notification_controller");
const { protect } = require("../../middleware/protect");

// List all notifications for the logged-in customer
router.get(
  "/",
  protect("customer"),
  NotificationController.listAllNotificationsForCustomer
);

// List only unread notifications
router.get(
  "/unread",
  protect("customer"),
  NotificationController.listUnreadNotificationsForCustomer
);

// Get a single notification by ID
router.get(
  "/:id",
  protect("customer"),
  NotificationController.getNotificationById
);

// Mark a single notification as seen/read
router.put(
  "/:id/seen",
  protect("customer"),
  NotificationController.MakeSeenNotofication
);

// Mark all notifications as read
router.put(
  "/mark-all-read",
 protect("customer"),
  NotificationController.markAsRead
);

// Get unread notification count
router.get(
  "/count/unread",
  protect("customer"),
  NotificationController.unreadCount
);

module.exports = router;
