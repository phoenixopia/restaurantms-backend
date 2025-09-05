const { Notification, User, Branch } = require("../models");
const { getIo } = require("../socket");
const { Op } = require("sequelize");
const throwError = require("./throwError");

const SendNotification = {
  // ========= Ticketing Notification =========
  async sendTicketingNotification(
    restaurant_id,
    title,
    message,
    created_by = null,
    branch_id = null
  ) {
    let where = {};

    if (branch_id) {
      where.branch_id = branch_id;
    } else if (restaurant_id) {
      where.restaurant_id = restaurant_id;
    } else {
      throwError("Invalid sender info", 400);
    }

    const users = await User.findAll({ where });
    const notifications = [];
    const io = getIo();

    for (const u of users) {
      const notification = await Notification.create({
        title,
        message,
        type: "TICKET",
        state: "info",
        data: null,
        created_by,
        target_user_id: u.id,
        restaurant_id: u.restaurant_id,
        branch_id: u.branch_id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },

  // ========= Inventory Notification =========
  async sendInventoryNotification(
    branch_id,
    title,
    message,
    created_by = null
  ) {
    const branch = await Branch.findByPk(branch_id, {
      attributes: ["id", "restaurant_id"],
    });
    if (!branch) throwError("Branch not found", 404);

    const users = await User.findAll({
      where: {
        [Op.or]: [{ branch_id }, { restaurant_id: branch.restaurant_id }],
      },
    });
    const notifications = [];
    const io = getIo();

    for (const u of users) {
      const notification = await Notification.create({
        title,
        message,
        type: "INVENTORY",
        state: "info",
        data: null,
        created_by,
        target_user_id: u.id,
        restaurant_id: branch.restaurant_id,
        branch_id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },
  // ========= Admin Notification =========
  async sendAdminNotification(title, message, created_by = null) {
    const users = await User.findAll({
      where: {
        restaurant_id: { [Op.is]: null },
        branch_id: { [Op.is]: null },
      },
    });

    const notifications = [];
    const io = getIo();

    for (const u of users) {
      const notification = await Notification.create({
        title,
        message,
        type: "ADMIN",
        state: "info",
        data: null,
        created_by,
        target_user_id: u.id,
        restaurant_id: null,
        branch_id: null,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },

  // ========= Plan Notification ==========
  async sendPlanNotification(title, message, created_by = null) {
    const users = await User.findAll({
      where: {
        restaurant_id: { [Op.is]: null },
        branch_id: { [Op.is]: null },
      },
    });

    const notifications = [];
    const io = getIo();

    for (const u of users) {
      const notification = await Notification.create({
        title,
        message,
        type: "SYSTEM",
        state: "info",
        data: null,
        created_by,
        target_user_id: u.id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },
  // ========== Send Vidoe Notification =========
  async sendVideoUploadedNotification(video, created_by = null) {
    const notifications = [];
    const io = getIo();
    const { restaurant_id, branch_id, title, id: video_id } = video;

    // ========= Notify restaurant users =========
    const restaurantUsers = await User.findAll({
      where: { restaurant_id },
    });

    for (const u of restaurantUsers) {
      const notification = await Notification.create({
        title: `New video uploaded: ${title}`,
        message: `A new video has been uploaded in your restaurant.`,
        type: "VIDEO",
        state: "info",
        data: { video_id },
        created_by,
        target_user_id: u.id,
        restaurant_id: u.restaurant_id,
        branch_id: u.branch_id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    // ========= Notify branch users (if branch_id exists) =========
    if (branch_id) {
      const branchUsers = await User.findAll({
        where: { branch_id },
      });

      for (const u of branchUsers) {
        const notification = await Notification.create({
          title: `New video uploaded: ${title}`,
          message: `A new video has been uploaded in your branch.`,
          type: "VIDEO",
          state: "info",
          data: { video_id },
          created_by,
          target_user_id: u.id,
          restaurant_id: u.restaurant_id,
          branch_id: u.branch_id,
        });

        notifications.push(notification);
        io.to(`user_${u.id}`).emit("notification", notification);
      }
    }

    // ========= Notify super admins =========
    const superAdmins = await User.findAll({
      where: {
        restaurant_id: { [Op.is]: null },
        branch_id: { [Op.is]: null },
      },
    });

    for (const u of superAdmins) {
      const notification = await Notification.create({
        title: `New video uploaded: ${title}`,
        message: `A new video has been uploaded${
          branch_id ? " in branch " + branch_id : ""
        }.`,
        type: "VIDEO",
        state: "info",
        data: { video_id },
        created_by,
        target_user_id: u.id,
        restaurant_id: null,
        branch_id: null,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },

  // ========== Send Video Status Update Notification ==========
  async sendVideoStatusUpdateNotification(video, newStatus, updatedBy) {
    const notifications = [];
    const io = getIo();
    const { restaurant_id, branch_id, title, id: video_id } = video;

    const statusMessage =
      newStatus === "approved"
        ? "has been approved"
        : newStatus === "rejected"
        ? "has been rejected"
        : `status changed to ${newStatus}`;

    // ========= Notify restaurant users =========
    const restaurantUsers = await User.findAll({
      where: { restaurant_id },
    });

    for (const u of restaurantUsers) {
      const notification = await Notification.create({
        title: `Video status updated: ${title}`,
        message: `A video ${statusMessage} in your restaurant.`,
        type: "VIDEO",
        state: "info",
        data: { video_id, newStatus },
        created_by: updatedBy,
        target_user_id: u.id,
        restaurant_id: u.restaurant_id,
        branch_id: u.branch_id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    // ========= Notify branch users (if branch_id exists) =========
    if (branch_id) {
      const branchUsers = await User.findAll({
        where: { branch_id },
      });

      for (const u of branchUsers) {
        const notification = await Notification.create({
          title: `Video status updated: ${title}`,
          message: `A video ${statusMessage} in your branch.`,
          type: "VIDEO",
          state: "info",
          data: { video_id, newStatus },
          created_by: updatedBy,
          target_user_id: u.id,
          restaurant_id: u.restaurant_id,
          branch_id: u.branch_id,
        });

        notifications.push(notification);
        io.to(`user_${u.id}`).emit("notification", notification);
      }
    }

    // ========= Notify super admins =========
    const superAdmins = await User.findAll({
      where: {
        restaurant_id: { [Op.is]: null },
        branch_id: { [Op.is]: null },
      },
    });

    for (const u of superAdmins) {
      const notification = await Notification.create({
        title: `Video status updated: ${title}`,
        message: `A video ${statusMessage}${
          branch_id ? " in branch " + branch_id : ""
        }.`,
        type: "VIDEO",
        state: "info",
        data: { video_id, newStatus },
        created_by: updatedBy,
        target_user_id: u.id,
        restaurant_id: null,
        branch_id: null,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },

  // ========== Send Video Deletion Notification ==========
  async sendVideoDeletedNotification(video, deletedBy = null) {
    const notifications = [];
    const io = getIo();
    const { restaurant_id, branch_id, title, id: video_id } = video;

    const messageText = `A video has been deleted${
      branch_id ? " in your branch" : " in your restaurant"
    }.`;

    // ========= Notify restaurant users =========
    const restaurantUsers = await User.findAll({ where: { restaurant_id } });
    for (const u of restaurantUsers) {
      const notification = await Notification.create({
        title: `Video deleted: ${title}`,
        message: messageText,
        type: "SYSTEM",
        state: "info",
        data: { video_id },
        created_by: deletedBy,
        target_user_id: u.id,
        restaurant_id: u.restaurant_id,
        branch_id: u.branch_id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    // ========= Notify branch users (if branch_id exists) =========
    if (branch_id) {
      const branchUsers = await User.findAll({ where: { branch_id } });
      for (const u of branchUsers) {
        const notification = await Notification.create({
          title: `Video deleted: ${title}`,
          message: messageText,
          type: "SYSTEM",
          state: "info",
          data: { video_id },
          created_by: deletedBy,
          target_user_id: u.id,
          restaurant_id: u.restaurant_id,
          branch_id: u.branch_id,
        });

        notifications.push(notification);
        io.to(`user_${u.id}`).emit("notification", notification);
      }
    }

    return notifications;
  },

  // ========== Send Table Notification ==========
  async tableNotification({ table, action, created_by = null }) {
    const { id: table_id, restaurant_id, branch_id, table_number } = table;
    const io = getIo();

    // Fetch users for the branch and restaurant
    const users = await User.findAll({
      where: {
        [Op.or]: [{ branch_id }, { restaurant_id }],
      },
    });

    const notifications = [];
    const actionMessage = {
      create: "has been created",
      update: "has been updated",
      delete: "has been deleted",
    }[action];

    if (!actionMessage) throwError("Invalid table action", 400);

    for (const u of users) {
      const notification = await Notification.create({
        title: `Table ${table_number} ${action}`,
        message: `Table "${table_number}" ${actionMessage} in your ${
          u.branch_id === branch_id ? "branch" : "restaurant"
        }.`,
        type: "SYSTEM",
        state: "info",
        data: { table_id, action },
        created_by,
        target_user_id: u.id,
        restaurant_id: u.restaurant_id,
        branch_id: u.branch_id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },
};

module.exports = SendNotification;
