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
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const { rows, pagination } = await NotificationService.listNotifications(
    req.user,
    page,
    limit
  );

  
  const message = rows.length === 0 ? "No notifications found" : "Notifications retrieved";

 return success(res, "Notifications retrieved", rows, 200);
});

exports.getNotificationById = asyncHandler(async (req, res) => {
  const notification = await NotificationService.getNotificationById(
    req.params.id
  );
  return success(res, "Notification retrieved", notification, 200);
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

exports.deleteNotification = asyncHandler(async (req, res) => {
  const result = await NotificationService.deleteNotification(req.params.id);
  return success(res, "Notification deleted successfully", result, 200);
});

exports.deleteAllNotifications = asyncHandler(async (req, res) => {
  const result = await NotificationService.deleteAllNotifications(req.user);
  return success(res, "Notification deleted successfully", result, 200);
});
