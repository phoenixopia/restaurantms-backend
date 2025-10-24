"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const NotificationService = require("../../services/customer/notification_service");
const { success } = require("../../utils/apiResponse");


exports.listAllNotificationsForCustomer = asyncHandler(async (req, res) => {
    const customerId = req.user.id;

    const { rows, count } = await NotificationService.listAllNotificationsForCustomer(req.query, customerId);

    if (count === 0) {
        return success(res, "No notifications found", [], 404);
    }

    return success(res, "Notifications retrieved", rows, 200);
});

exports.listUnreadNotificationsForCustomer = asyncHandler(async (req, res) => {
    const customerId = req.user.id;

    const { rows, count } = await NotificationService.listUnreadNotificationsForCustomer(req.query, customerId);

    if (count === 0) {
        return success(res, "No notifications found", [], 404);
    }

    return success(res, "Notifications retrieved", rows, 200);
});


exports.getNotificationById = asyncHandler(async (req, res) => {
  const notification = await NotificationService.getNotificationById(
    req.params.id
  );
  return success(res, "Notification retrieved", notification, 200);
});



exports.MakeSeenNotofication = asyncHandler(async (req, res) => {
  const notification = await NotificationService.MakeSeenNotofication(req.params.id);
  return success(res, "Notification marked as read", notification, 200);
});


exports.markAsRead = asyncHandler(async (req, res) => {
    const updatedCount = await NotificationService.markAsRead(req.user.id);

    if (updatedCount === 0) {
        return success(res, "No notifications found", [], 404);
    }

    return success(res, "All notifications marked as read", [], 200);
});


exports.unreadCount = asyncHandler(async (req, res) => {
  const count = await NotificationService.unreadCount(req.user.id);
  return success(
    res,
    "Unread notifications count retrieved",
    { unread: count },
    200
  );
});



