"use strict";

const { Notification, User, sequelize } = require("../../models");
const { Op } = require("sequelize");
const { getIo } = require("../../socket");
const throwError = require("../../utils/throwError");

const NotificationService = {
  async createAndSendNotification({
    title,
    message,
    state = "info",
    target_user_id = null,
    branch_id = null,
    restaurant_id = null,
    data = null,
    created_by = null,
  }) {
    let notifications = [];

    // Send to specific user
    if (target_user_id) {
      const notification = await Notification.create({
        title,
        message,
        state,
        target_user_id,
        branch_id,
        restaurant_id,
        data,
        created_by,
      });
      notifications.push(notification);

      const io = getIo();
      io.to(`user_${target_user_id}`).emit("notification", notification);
    }
    // Send to branch users
    else if (branch_id) {
      const users = await User.findAll({ where: { branch_id } });
      const io = getIo();

      for (const u of users) {
        const notification = await Notification.create({
          title,
          message,
          state,
          target_user_id: u.id,
          branch_id,
          restaurant_id,
          data,
          created_by,
        });
        notifications.push(notification);
        io.to(`user_${u.id}`).emit("notification", notification);
      }
    }
    // Send to restaurant users
    else if (restaurant_id) {
      const users = await User.findAll({ where: { restaurant_id } });
      const io = getIo();

      for (const u of users) {
        const notification = await Notification.create({
          title,
          message,
          state,
          target_user_id: u.id,
          branch_id,
          restaurant_id,
          data,
          created_by,
        });
        notifications.push(notification);
        io.to(`user_${u.id}`).emit("notification", notification);
      }
    } else {
      throwError(
        "Please provide target_user_id, branch_id, or restaurant_id",
        400
      );
    }

    return notifications;
  },

  async listNotifications(user, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const where = {
      [Op.or]: [
        { target_user_id: user?.id || null },
        { branch_id: user?.branch_id || null },
        { restaurant_id: user?.restaurant_id || null },
      ],
    };

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return { rows, count };
  },

  async markAsRead(notificationId) {
    const notification = await Notification.findByPk(notificationId);
    if (!notification) throwError("Notification not found", 404);

    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();

    return notification;
  },

  async unreadCount(user) {
    const where = {
      is_read: false,
      [Op.or]: [
        { target_user_id: user?.id || null },
        { branch_id: user?.branch_id || null },
        { restaurant_id: user?.restaurant_id || null },
      ],
    };

    const count = await Notification.count({ where });
    return count;
  },

  async markAllAsRead(user) {
    if (!user?.id) throwError("User ID is required", 400);

    const where = {
      target_user_id: user.id,
      is_read: false,
    };

    const [updatedCount] = await Notification.update(
      { is_read: true, read_at: new Date() },
      { where }
    );

    return { updatedCount };
  },

  async deleteNotification(user, notificationId) {
    if (!user.id) throwError("User ID is required", 400);

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        target_user_id: user.id,
      },
    });

    if (!notification) throwError("Notification not found", 404);

    await notification.destroy();

    return { deleted: true, id: notificationId };
  },
};

module.exports = NotificationService;
