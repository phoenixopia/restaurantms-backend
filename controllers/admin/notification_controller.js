"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const NotificationService = require("../../services/admin/notification_service");
const { success } = require("../../utils/apiResponse");

exports.createNotification = asyncHandler(async (req, res) => {
  const created_by = req.user?.id || null;

  const notifications = await NotificationService.createAndSendNotification({
    ...req.body,
    created_by,
  });

  return success(res, "Notification created successfully", notifications, 201);
});

exports.listNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const { rows, count } = await NotificationService.listNotifications(
    req.user,
    page,
    limit
  );

  if (count === 0) {
    return success(res, "No notifications found", [], 200);
  }

  return success(res, "Notifications retrieved", rows, 200);
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await NotificationService.markAsRead(req.params.id);
  return success(res, "Notification marked as read", notification, 200);
});

exports.unreadCount = asyncHandler(async (req, res) => {
  const count = await NotificationService.unreadCount(req.user);
  return success(
    res,
    "Unread notifications count retrieved",
    { unread: count },
    200
  );
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  const notifications = await NotificationService.markAllAsRead(req.user);
  return success(res, "All notifications marked as read", notifications, 200);
});
