"use strict";

const asyncHandler = require("../../middleware/asyncHandler");
const NotificationService = require("../../services/admin/notification_service");
const { success } = require("../../utils/apiResponse");

exports.createNotification = asyncHandler(async (req, res) => {
  const { user_id, customer_id, channel, title, body } = req.body;
  const io = req.app.get("io");

  const notification = await NotificationService.createAndSendNotification({
    user_id,
    customer_id,
    channel,
    title,
    body,
    io,
  });

  return success(res, "Notification sent successfully", notification, 201);
});

exports.getAllNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const requester = req.user || req.customer;

  const notifications = await NotificationService.getAllNotifications({
    page: parseInt(page),
    limit: parseInt(limit),
    requester,
  });

  return success(res, "Notifications fetched successfully", notifications);
});

exports.getNotificationById = asyncHandler(async (req, res) => {
  const requester = req.user || req.customer;

  const notification = await NotificationService.getNotificationById(
    req.params.id,
    requester
  );

  return success(res, "Notification fetched successfully", notification);
});

exports.retryNotification = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const notification = await NotificationService.retryNotification(
    req.params.id,
    io
  );

  return success(res, "Notification retried successfully", notification);
});
